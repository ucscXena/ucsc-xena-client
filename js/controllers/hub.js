var {Let, assocIn, dissoc, deepMerge, get, identity,
	matchKeys, pick, pluck, uniq, updateIn} = require('../underscore_ext').default;
import {make, mount, compose} from './utils';
var {cohortSummary, datasetMetadata, datasetSamplesExamples, datasetFieldN,
	datasetFieldExamples, fieldCodes, datasetField, datasetFetch, datasetList,
	datasetSamples, sparseDataExamples, segmentDataExamples} = require('../xenaQuery');
var {servers: {localHub}, serverS3url} = require('../defaultServers');
var {delete: deleteDataset} = require('../xenaAdmin');
var {userServers} = require('./common');
var {ignoredType} = require('../models/dataType');
var Rx = require('../rx').default;
import {defaultHost} from '../urlParams';
import cohortMetaData from '../cohortMetaData';
import {isAuthPending} from '../models/auth';
import query from './query';

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

var setHubs = (state, params) => addHubs(removeHubs(state, params), params);

var authParams = () => ({
	withCredentials: true,
	headers: {'X-Redirect-To': location.origin}
});

var {ajax, of, zip, zipArray} = Rx.Observable;

var authAjax = opts => ajax(deepMerge(authParams(), opts));

var ajaxGet = url => authAjax({url, crossDomain: true, method: 'GET', responseType: 'text'});

var hostToGitURL = host => `${cohortMetaData}/hub_${host.replace(/https?:\/\//, '')}/info.mdown`;
var hubMeta = host => ajaxGet(hostToGitURL(host)).catch(() => ajaxGet(`${host}/download/meta/info.mdown`)).map(r => r.response);

var cohortMeta = cohort => ajaxGet(`${cohortMetaData}/cohort_${cohort}/info.mdown`).map(r => r.response);

var datasetDescription = dataset => ajaxGet(`${cohortMetaData}/dataset/${dataset}/info.mdown`).map(r => r.response);

var getMarkDown = url => ajaxGet(url).map(r => r.response);

// emit url if HEAD request succeeds
var head = url => authAjax({url, crossDomain: true, method: 'HEAD'}).map(() => url);

// Check for dataset download link. If not there, try the link with '.gz'
// suffix. If not there, return undefined.
var checkDownload = (host, dataset) => {
	var link = `${host}/download/${encodeURIComponent(dataset)}`,
		gzlink = `${link}.gz`,
		s3link = `${serverS3url[host]}/${encodeURIComponent(dataset)}`,
		s3gzlink = `${s3link}.gz`,
		dl = head(link),
		gzdl = head(gzlink),
		s3dl = head(s3link),
		s3gzdl = head (s3gzlink);

	return s3gzdl.catch(() => s3dl).catch(() => gzdl).catch(() => dl);
};

var noSnippets = () => of(undefined);

// XXX See note in models/denseMatrix.js. Move this to binpack, or something.
var toArray = x => new Float32Array(x.buffer);

function fetchMatrixDataSnippets(host, dataset, meta, nProbes = 10, nSamples = 10) {
	var samplesQ = datasetSamplesExamples(host, dataset, nSamples).share(),
		fieldQ = datasetFieldExamples(host, dataset, nProbes).share(),
		codeQ = fieldQ.mergeMap(probes => fieldCodes(host, dataset, probes)),
		dataQ = zipArray(samplesQ, fieldQ)
			.mergeMap(([samples, fields]) => datasetFetch(host, dataset, samples, fields));

	return zipArray(samplesQ, fieldQ, codeQ, dataQ)
		.map(([samples, fields, codes, data]) => ({samples, fields, codes, data: data.map(toArray)}));
}

var mutationAttrs = ({rows}) => ({
	chrom: pluck(rows.position, 'chrom'),
	chromstart: pluck(rows.position, 'chromstart'),
	chromend: pluck(rows.position, 'chromend'),
	...pick(rows, 'sampleID', 'ref', 'alt', 'effect', 'amino-acid', 'gene')
});

var fetchMutationDataSnippets = (host, dataset, nProbes = 10) =>
	sparseDataExamples(host, dataset, nProbes).map(mutationAttrs);

var segmentAttrs = ({rows}) => ({
	chrom: pluck(rows.position, 'chrom'),
	chromstart: pluck(rows.position, 'chromstart'),
	chromend: pluck(rows.position, 'chromend'),
	...pick(rows, 'sampleID', 'value')
});

var fetchSegmentedDataSnippets = (host, dataset, nProbes = 10) =>
	segmentDataExamples(host, dataset, nProbes).map(segmentAttrs);

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
		probemapQ = metaQ.mergeMap(meta =>
			get(meta, 'probeMap') ? checkDownload(host, meta.probeMap) : of(undefined));

	return zip(metaQ, dataQ, downloadQ, probemapQ, (meta, data, downloadLink, probemapLink) =>
			({meta, data, downloadLink, probemapLink}));
};

// XXX This re-fetches the dataset metadata. We split this out
// because the probe query can be slow. It would be better to fetch
// the metadata once, but currently the controller/query.js mechanisms
// don't implement dependent queries.
var datasetProbeCount = (host, dataset) => {
	var metaQ = datasetMetadata(host, dataset).map(m => m[0]);
	return metaQ.mergeMap(meta => probeCountMethod(meta)(host, dataset));
};

var spreadsheetControls = {
	'init': (state, pathname, params) => setHubs(state, params),
	'add-host': (state, host) =>
		assocIn(state, ['servers', host], {user: true}),
	'remove-host': (state, host) =>
		updateIn(state, ['servers'], s => dissoc(s, host)),
	'enable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], true),
	'disable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], false),
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
		['datasetProbeCount', host, dataset],
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
	state.page !== 'datapages' || isAuthPending(state) ? [] :
	Let((method = sectionDataMethods[getSection(defaultHost(state.params))]) =>
		method ? method(state) : []);

var fetchMethods = {
	samples: (host, dataset) => datasetSamples(host, dataset, null),
	identifiers: datasetField,
	dataset: datasetMetaAndLinks,
	datasetDescription,
	datasetProbeCount,
	markdown: getMarkDown,
	cohort: cohortMeta,
	// XXX Note that this will cache lists from hubs that the user has
	// recently disabled. We only clear cache when the cohort is changed.
	// OTOH it will fetch any recently enabled hubs. So, the view should
	// iterate over the userServer list, not this cache.
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]),
	cohorts: server => cohortSummary(server, ignoredType),
	hubMeta: hubMeta
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

var {controller: fetchController, invalidatePath} =
	query(fetchMethods, sectionData, cachePolicy, 'datapages');

// ['cohorts', localHub]
// ['hubMeta', localHub]
// ['samples', localHub, *]
// ['identifiers', localHub, *]
// ['dataset', localHub, *]
// ['cohortDatasets', *, localHub]
var invalidateLocalHub = Let(({any} = matchKeys) =>
	function (serverBus) {
		invalidatePath(serverBus, ['cohorts', localHub]);
		invalidatePath(serverBus, ['hubMeta', localHub]);
		invalidatePath(serverBus, ['samples', localHub, any]);
		invalidatePath(serverBus, ['identifiers', localHub, any]);
		invalidatePath(serverBus, ['dataset', localHub, any]);
		invalidatePath(serverBus, ['cohortDatasets', any, localHub]);
	});

var controls = {
	'localStatus-post!': invalidateLocalHub,
	'localQueue-post!': invalidateLocalHub,
	'delete-dataset-post!': (serverBus, state, newState, host, name) =>
		serverBus.next(['dataset-deleted', deleteDataset(host, name)]),
};

export default compose(
		fetchController,
		mount(make(spreadsheetControls), ['spreadsheet']),
		make(controls));
