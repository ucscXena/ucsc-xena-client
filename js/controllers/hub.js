'use strict';
var {updateIn, dissoc, contains, pick, isEqual, get, difference,
	concat, pluck, getIn, assocIn, identity} = require('../underscore_ext');
var {make, mount, compose} = require('./utils');
var {cohortSummary, datasetMetadata, datasetSamplesExamples,
	datasetFieldExamples, fieldCodes, datasetProbeValues,
	sparseDataExamples, segmentDataExamples} = require('../xenaQuery');
var {userServers, datasetQuery} = require('./common');
var Rx = require('../rx');

function setHubs(state, {hubs}) {
	return hubs ?
		hubs.reduce(
			(state, hub) => assocIn(state, ['servers', hub, 'user'], true),
			state) :
		state;
}

var {ajax, of, zip, zipArray} = Rx.Observable;
var ajaxGet = url => ajax({url, crossDomain: true, method: 'GET', responseType: 'text'});

var hubMeta = host => ajaxGet(`${host}/download/meta/info.mdown`).map(r => r.response)
	.catch(() => of(undefined));

var notGenomic = ["sampleMap", "probeMap", "genePred", "genePredExt"];
var genomicCohortSummary = server =>
		zipArray([cohortSummary(server, notGenomic), hubMeta(server)])
		.map(([cohorts, meta]) => ({server, meta, cohorts}))
		.catch(err => {console.log(err); return of({server, cohorts: []});});

function fetchCohortSummary(serverBus, servers) {
	var q = Rx.Observable.zipArray(servers.map(genomicCohortSummary));

	serverBus.next(['cohort-summary', q]);
}

function fetchDatasets(serverBus, state) {
	var {cohort} = state.params,
		servers = userServers(state.spreadsheet);
	serverBus.next(['cohort-datasets', datasetQuery(servers, [{name: cohort}]), cohort]);
}

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

function fetchMatrixDataSnippets(host, dataset, meta, nProbes = 10, nSamples = 10) {
	var samplesQ = datasetSamplesExamples(host, dataset, nSamples).share(),
		fieldQ = datasetFieldExamples(host, dataset, nProbes).share(),
		codeQ = fieldQ.mergeMap(probes => fieldCodes(host, dataset, probes)),
		dataQ = zipArray(samplesQ, fieldQ)
			.mergeMap(([samples, fields]) => datasetProbeValues(host, dataset, samples, fields).map(data => data[1]));

	return zipArray(samplesQ, fieldQ, codeQ, dataQ)
		.map(([samples, fields, codes, data]) => ({samples, fields, codes, data}));
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

var noSnippets = () => of(undefined);

var snippetMethod = ({type = 'genomicMatrix'} = {}) =>
	type === 'clinicalMatrix' ? fetchMatrixDataSnippets :
	type === 'genomicMatrix' ? fetchMatrixDataSnippets :
	type === 'mutationVector' ? fetchMutationDataSnippets :
	type === 'genomicSegment' ? fetchSegmentedDataSnippets :
	noSnippets;

var datasetMetaAndLinks = (host, dataset) => {
	var metaQ = datasetMetadata(host, dataset).map(m => m[0]).share(),
		downloadQ = checkDownload(host, dataset),
		dataQ = metaQ.mergeMap(meta => snippetMethod(meta)(host, dataset)),
		probemapQ = metaQ.mergeMap(meta =>
			get(meta, 'probeMap') ? checkDownload(host, meta.probeMap) : of(undefined));

	return zip(metaQ, dataQ, downloadQ, probemapQ, (meta, data, downloadLink, probemapLink) =>
			({meta, data, downloadLink, probemapLink}));
};

function fetchDataset(serverBus, state) {
	var {host, dataset} = state.params;
	serverBus.next(['dataset-meta', datasetMetaAndLinks(host, dataset), host, dataset]);
}

var spreadsheetControls = {
	'init': (state, params) => setHubs(state, params),
	'add-host': (state, host) =>
		assocIn(state, ['servers', host], {user: true}),
	'remove-host': (state, host) =>
		updateIn(state, ['servers'], s => dissoc(s, host)),
	'enable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], true),
	'disable-host': (state, host, list) =>
		assocIn(state, ['servers', host, list], false)
};

var controls = {
	'cohort-summary': (state, cohorts) =>
		updateIn(state, ['datapages', 'cohorts'],
				(list = []) => concat(list, cohorts)),
	'cohort-datasets': (state, datasets, cohort) =>
		assocIn(state, ['datapages', 'cohort'], {cohort, datasets}),
	'dataset-meta': (state, metaAndLinks, host, dataset) =>
		assocIn(state, ['datapages', 'dataset'], {host, dataset, ...metaAndLinks})
};

var getSection = ({dataset, host, cohort}) =>
	dataset && host ? 'dataset' :
	host ? 'hub' :
	cohort ? 'cohort' :
	'summary';

var needCohortHubs = state =>
	state.page === 'datapages' &&
	contains(['summary', 'hub'], getSection(state.params)) ?
	userServers(state.spreadsheet) : [];

var hasCohortHubs = state => pluck(getIn(state, ['datapages', 'cohorts'], []), 'server');


var needACohort = state =>
	state.page === 'datapages' &&
	getSection(state.params) === 'cohort' &&
	state.params.cohort;

var hasACohort = (state, cohort) =>
	cohort === getIn(state, ['datapages', 'cohort', 'cohort']);

var needDataset = state =>
	state.page === 'datapages' &&
	getSection(state.params) === 'dataset' &&
	pick(state.params, 'dataset', 'host');

var hasDataset = (state, {dataset, host}) =>
	dataset === getIn(state, ['datapages', 'dataset', 'dataset']) &&
	host === getIn(state, ['datapages', 'dataset', 'host']);


// We don't save datapages over reload. We fetch missing data the first
// time it is required, meaning a) in the previous state we did not
// require it, or b) it is the 'init' action.
function datapagesPostActions(serverBus, state, newState, action) {
	var [type] = action;

	// Fast check for the typical case, where nothing has changed
	if (type === 'init' || newState.spreadsheet.servers !== state.spreadsheet.servers) {
		let needHubs = needCohortHubs(newState),
			hasHubs = hasCohortHubs(newState),
			missing = difference(needHubs, hasHubs);

		if (missing.length) {
			fetchCohortSummary(serverBus, missing);
		}
	}

	var aCohort = needACohort(newState);
	if (aCohort && !hasACohort(newState, aCohort) &&
		   (type === 'init' || needACohort(state) !== aCohort)) {
		fetchDatasets(serverBus, newState);
	}

	var dataset = needDataset(newState);
	if (dataset && !hasDataset(state, dataset) &&
			(type === 'init' || !isEqual(needDataset(state), dataset))) {
		fetchDataset(serverBus, newState);
	}
}

var datapagesPostController = {
	action: identity,
	postAction: datapagesPostActions
};

module.exports = compose(
		datapagesPostController,
		mount(make(spreadsheetControls), ['spreadsheet']),
		make(controls));
