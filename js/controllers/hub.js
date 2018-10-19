'use strict';
var {updateIn, dissoc, pick, isEqual, Let, get, uniq, identity,
	last, mapObject, initial, merge, pluck, getIn, assocIn} = require('../underscore_ext');
var {make, mount, compose} = require('./utils');
var {cohortSummary, datasetMetadata, datasetSamplesExamples, datasetFieldN,
	datasetFieldExamples, fieldCodes, datasetField, datasetFetch, datasetList,
	datasetSamples, sparseDataExamples, segmentDataExamples} = require('../xenaQuery');
var {servers: {localHub}} = require('../defaultServers');
var {delete: deleteDataset} = require('../xenaAdmin');
var {userServers, updateWizard} = require('./common');
var {ignoredType} = require('../models/dataType');
var Rx = require('../rx');
import {defaultHost} from '../urlParams';
import cohortMetaData from '../cohortMetaData';

var hubsToAdd = ({hubs, addHub}) =>
	(hubs || []).concat(addHub || []);

var hubsToRemove = ({removeHub}) => removeHub || [];

var removeHubs = (state, params) =>
	hubsToRemove(params).reduce(
			(state, hub) => assocIn(state, ['servers', hub, 'user'], false),
			state);

var addHubs = (state, params) =>
	hubsToAdd(params).reduce(
			(state, hub) => assocIn(state, ['servers', hub, 'user'], true),
			state);

var setHubs = (state, params) => removeHubs(addHubs(state, params), params);

var {ajax, of, zip, zipArray} = Rx.Observable;
var ajaxGet = url => ajax({url, crossDomain: true, method: 'GET', responseType: 'text'});

var hostToGitURL = host => `${cohortMetaData}/hub_${host.replace(/https?:\/\//, '')}/info.mdown`;
var hubMeta = host => ajaxGet(hostToGitURL(host)).catch(() => ajaxGet(`${host}/download/meta/info.mdown`)).map(r => r.response)
        .catch(() => of({error: 'not available'}));

var cohortMeta = cohort => ajaxGet(`${cohortMetaData}/cohort_${cohort}/info.mdown`).map(r => r.response)
	.catch(() => of({error: 'not available'}));

var datasetDescription = dataset => ajaxGet(`${cohortMetaData}/dataset/${dataset}/info.mdown`).map(r => r.response)
	.catch(() => of({error: 'not available'}));

var getMarkDown = url => ajaxGet(url).map(r => r.response)
	.catch(() => of({error: 'not available'}));

// emit url if HEAD request succeeds
var head = url => ajax({url, crossDomain: true, method: 'HEAD'}).map(() => url);

// Check for dataset download link. If not there, try the link with '.gz'
// suffix. If not there, return undefined.
var checkDownload = (host, dataset) => {
	var link = `${host}/download/${dataset}`,
		gzlink = `${link}.gz`,
		dl = head(link),
		gzdl = head(gzlink),
		nodl = of(undefined);

	return dl.catch(() => gzdl).catch(() => nodl);
};

var noSnippets = () => of(undefined);

function fetchMatrixDataSnippets(host, dataset, meta, nProbes = 10, nSamples = 10) {
	var samplesQ = datasetSamplesExamples(host, dataset, nSamples).share(),
		fieldQ = datasetFieldExamples(host, dataset, nProbes).share(),
		codeQ = fieldQ.mergeMap(probes => fieldCodes(host, dataset, probes)),
		dataQ = zipArray(samplesQ, fieldQ)
			.mergeMap(([samples, fields]) => datasetFetch(host, dataset, samples, fields));

	return zipArray(samplesQ, fieldQ, codeQ, dataQ)
		.map(([samples, fields, codes, data]) => ({samples, fields, codes, data}))
		.catch(noSnippets);
}

var mutationAttrs = ({rows}) => ({
	chrom: pluck(rows.position, 'chrom'),
	chromstart: pluck(rows.position, 'chromstart'),
	chromend: pluck(rows.position, 'chromend'),
	...pick(rows, 'sampleID', 'ref', 'alt', 'effect', 'amino-acid', 'gene')
});

var fetchMutationDataSnippets = (host, dataset, nProbes = 10) =>
	sparseDataExamples(host, dataset, nProbes).map(mutationAttrs)
	.catch(noSnippets);

var segmentAttrs = ({rows}) => ({
	chrom: pluck(rows.position, 'chrom'),
	chromstart: pluck(rows.position, 'chromstart'),
	chromend: pluck(rows.position, 'chromend'),
	...pick(rows, 'sampleID', 'value')
});

var fetchSegmentedDataSnippets = (host, dataset, nProbes = 10) =>
	segmentDataExamples(host, dataset, nProbes).map(segmentAttrs)
	.catch(noSnippets);

var snippetMethod = ({type = 'genomicMatrix'} = {}) =>
	type === 'clinicalMatrix' ? fetchMatrixDataSnippets :
	type === 'genomicMatrix' ? fetchMatrixDataSnippets :
	type === 'mutationVector' ? fetchMutationDataSnippets :
	type === 'genomicSegment' ? fetchSegmentedDataSnippets :
	noSnippets;


var noProbeCount = () => of(undefined);

var probeCountMethod = ({type = 'genomicMatrix'} = {}) =>
	type === 'clinicalMatrix' ? datasetFieldN :
	type === 'genomicMatrix' ? datasetFieldN :
	noProbeCount;

var datasetMetaAndLinks = (host, dataset) => {
	var metaQ = datasetMetadata(host, dataset).map(m => m[0]).share(),
		downloadQ = checkDownload(host, dataset),
		dataQ = metaQ.mergeMap(meta => snippetMethod(meta)(host, dataset)),
		probeCountQ = metaQ.mergeMap(meta => probeCountMethod(meta)(host, dataset)),
		probemapQ = metaQ.mergeMap(meta =>
			get(meta, 'probeMap') ? checkDownload(host, meta.probeMap) : of(undefined));

	return zip(metaQ, dataQ, probeCountQ, downloadQ, probemapQ, (meta, data, probeCount, downloadLink, probemapLink) =>
			({meta, data, probeCount, downloadLink, probemapLink}));
};

// wrapper to discard extra params
var hostUpdateWizard = (serverBus, state, newState) =>
	updateWizard(serverBus, state, newState);

var spreadsheetControls = {
	'init': (state, pathname = '/', params) => setHubs(state, params),
	'add-host': (state, host) =>
		assocIn(state, ['servers', host], {user: true}),
	'add-host-post!': hostUpdateWizard,
	'remove-host': (state, host) =>
		updateIn(state, ['servers'], s => dissoc(s, host)),
	'remove-host-post!': hostUpdateWizard,
	'enable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], true),
	'enable-host-post!': hostUpdateWizard,
	'disable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], false),
	'disable-host-post!': hostUpdateWizard
};

var linkedHub = state =>
	state.params.host ? [state.params.host] : [];

var getSection = ({dataset, host, cohort, allIdentifiers, allSamples, markdown}) =>
	markdown ? 'markdown' :
	allSamples ? 'samples' :
	allIdentifiers ? 'identifiers' :
	dataset && host ? 'dataset' :
	host ? 'hub' :
	cohort ? 'cohort' :
	'summary';

var sectionDataMethods = {
	samples: ({params: {host, dataset}}) => [['samples', host, dataset]],
	identifiers: ({params: {host, dataset}}) => [['identifiers', host, dataset]],
	dataset: ({params: {host, dataset}}) => [
		['dataset', host, dataset],
		['datasetDescription', dataset]],
	markdown: ({params: {markdown}}) => [['markdown', markdown]],
	cohort: ({params: {cohort}, spreadsheet}) => [
		['cohort', cohort],
		...Let((servers = userServers(spreadsheet)) =>
				servers.map(server => ['cohortDatasets', cohort, server]))],
	summary: state =>
		Let((servers = uniq(userServers(state.spreadsheet).concat(linkedHub(state)))) =>
				servers.map(server => ['cohorts', server])),
	hub: ({params}) =>
		Let(({host} = defaultHost(params)) => [
			['hubMeta', host],
			['cohorts', host]])
};

var sectionData = state =>
	Let((method = sectionDataMethods[getSection(defaultHost(state.params))]) =>
		method ? method(state) : []);

var fetchMethods = {
	samples: (host, dataset) => datasetSamples(host, dataset, null),
	identifiers: datasetField,
	dataset: datasetMetaAndLinks,
	datasetDescription: datasetDescription,
	markdown: getMarkDown,
	cohort: cohortMeta,
	// XXX Note that this will cache lists from hubs that the user has
	// recently disabled. We only clear cache when the cohort is changed.
	// OTOH it will fetch any recently enabled hubs. So, the view should
	// iterate over the userServer list, not this cache.
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]).catch(() => of([])),
	cohorts: server => cohortSummary(server, ignoredType).catch(() => of([])),
	hubMeta: hubMeta
};

// To make this more general, would need to follow the path until
// we hit a dispatch method, then pass args.
// XXX should this inject a common 'error' value, if the query fails?
// We would need to update some views where we currently map to empty
// array on error.
var fetchData = ([type, ...args]) => fetchMethods[type](...args);

// XXX Local mutatable state. The effects controller is stateful wrt
// data queries.
var queue = [];
var outOfDate = {};

// XXX Do we need to handle more actions? We're only handling a minimum.
var datapagesPostActions = (serverBus, state, newState) => {
	if (newState.page !== 'datapages') {
		// Note this means we don't do any cache operations when we leave the page.
		return;
	}

	var toFetch = sectionData(newState)
		.filter(path => (getIn(newState.datapages, path) == null || getIn(outOfDate, path))
				&& !find(queue, p => isEqual(p, path)));

	toFetch.forEach(path => {
		queue.push(path);
		serverBus.next([['merge-data', path], fetchData(path)]);
	});
};

var cachePolicy = {
	// cache all hosts
	cohorts: identity,
	// cache a single key: the last one updated.
	// XXX Doesn't work correctly for [host, dataset] paths, as it will accumulate
	// values until host changes. Should change this so we don't hold on to
	// multiple probe sets, for example.
	default: (state, path) =>
		updateIn(state, ['datapages', path[0]], item => pick(item, path[1]))
};

var clearCache = fn => (state, path, data) =>
	(cachePolicy[path[0]] || cachePolicy.default)(fn(state, path, data), path);

var enforceValue = (path, val) => {
	if (val == null) {
		// Fetch methods must return a value besides null or undefined. Otherwise
		// this will create a request loop, where we fetch again because we can't
		// tell the data has already been fetched.
		console.error(`Received invalid response for path ${path}`);
		return {error: 'invalid value'};
	}
	return val;
};

function invalidateKey(path) {
	outOfDate = assocIn(outOfDate, path, true);
}

function invalidateKeysUnder(state, path) {
	outOfDate = updateIn(outOfDate, path, ood =>
		merge(ood, mapObject(getIn(state, path, {}), () => true)));
}

function invalidatePick(state, path, key) {
	Object.keys(getIn(state, path, {})).map(k0 => [...path, k0, key])
		.forEach(invalidateKey);
}


// ['cohorts', localHub]
// ['hubMeta', localHub]
// ['samples', localHub, *]
// ['identifiers', localHub, *]
// ['dataset', localHub, *]
// ['cohortDatasets', *, localHub]
function invalidateLocalHub(state) {
	var datapages = get(state, 'datapages');
	invalidateKey(['cohorts', localHub]);
	invalidateKey(['hubMeta', localHub]);
	invalidateKeysUnder(datapages, ['samples', localHub]);
	invalidateKeysUnder(datapages, ['identifiers', localHub]);
	invalidatePick(datapages, ['cohortDatasets'], localHub);
}

function clearPath(path) {
	outOfDate = updateIn(outOfDate, initial(path), p => p && dissoc(p, last(path)));
}

function hubChangePost(serverBus, state, newState) {
	invalidateLocalHub(newState);
	datapagesPostActions(serverBus, state, newState);
}

var controls = {
	'init-post!': datapagesPostActions,
	'navigate-post!': datapagesPostActions,
	'history-post!': datapagesPostActions,
	'enable-host-post!': datapagesPostActions,
	'localStatus-post!': hubChangePost,
	'localQueue-post!': hubChangePost,
	'merge-data': clearCache((state, path, data) =>
		assocIn(state, ['datapages', ...path], enforceValue(path, data))),
	'merge-data-post!': (serverBus, state, newState, path) => {
		var i = queue.findIndex(p => isEqual(p, path));
		queue.splice(i, 1);
		clearPath(path);
	},
	'delete-dataset-post!': (serverBus, state, newState, host, name) =>
		serverBus.next(['dataset-deleted', deleteDataset(host, name)]),
};

module.exports = compose(
		mount(make(spreadsheetControls), ['spreadsheet']),
		make(controls));
