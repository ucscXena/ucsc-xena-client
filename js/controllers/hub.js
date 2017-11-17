'use strict';
var {assoc, updateIn, dissoc, contains, pick, isEqual, get,
	getIn, assocIn, constant, identity} = require('../underscore_ext');
var {make, mount, compose} = require('./utils');
var {cohortSummary, datasetMetadata} = require('../xenaQuery');
var {userServers, datasetQuery} = require('./common');
var Rx = require('../rx');

// After settings change, mark the server list dirty.
// This is used by the viz page.
var setServersChanged = state => assoc(state, 'serversChanged', true);

var setServersChangedIfUser = (list, state) =>
	list === 'user' ? setServersChanged(state) : state;

function setHubs(state, {hubs}) {
	return hubs ?
		hubs.reduce(
			(state, hub) => assocIn(state, ['servers', hub, 'user'], true),
			state) :
		state;
}

var {ajax, of, zipArray} = Rx.Observable;
var ajaxGet = url => ajax({url, crossDomain: true, method: 'GET', responseType: 'text'});

var hubMeta = host => ajaxGet(`${host}/download/meta/info.mdown`).map(r => r.response)
	.catch(() => of(undefined));

var notGenomic = ["sampleMap", "probeMap", "genePred", "genePredExt"];
var genomicCohortSummary = server =>
		zipArray([cohortSummary(server, notGenomic), hubMeta(server)])
		.map(([cohorts, meta]) => ({server, meta, cohorts}))
		.catch(err => {console.log(err); return of({server, cohorts: []});});

function fetchCohortSummary(serverBus, state) {
	var servers = userServers(state.spreadsheet),
		q = Rx.Observable.zipArray(servers.map(genomicCohortSummary));

	serverBus.next(['cohort-summary', q]);
}

function fetchDatasets(serverBus, state) {
	var {cohort} = state.params,
		servers = userServers(state.spreadsheet);
	serverBus.next(['cohort-datasets', datasetQuery(servers, [{name: cohort}]), cohort]);
}

var head = url => ({url, crossDomain: true, method: 'HEAD'});

// Do HEAD request for dataset download link. If not there,
// try the link with '.gz' suffix. If not there, return undefined.
var checkDownload = (host, dataset) => {
	var link = `${host}/download/${dataset}`,
		gzlink = `${link}.gz`;
	return ajax(head(link)).map(constant(link))
		.catch(() => ajax(head(gzlink)).map(constant(gzlink))
				.catch(() => of(undefined)));
};

var datasetMetaAndLinks = (host, dataset) =>
	zipArray(datasetMetadata(host, dataset), checkDownload(host, dataset))
		.mergeMap(([[meta], downloadLink]) =>
			(get(meta, 'probeMap') ? checkDownload(host, meta.probeMap) : of(undefined))
				.map(probemapLink => [meta, {downloadLink, probemapLink}]));

function fetchDataset(serverBus, state) {
	var {host, dataset} = state.params;
	serverBus.next(['dataset-meta', datasetMetaAndLinks(host, dataset), host, dataset]);
}

var spreadsheetControls = {
	'init': (state, params) => setHubs(state, params),
	'add-host': (state, host) =>
		setServersChanged(assocIn(state, ['servers', host], {user: true})),
	'remove-host': (state, host) =>
		setServersChanged(updateIn(state, ['servers'], s => dissoc(s, host))),
	'enable-host': (state, host, list) =>
		setServersChangedIfUser(list, assocIn(state, ['servers', host, list], true)),
	'disable-host': (state, host, list) =>
		setServersChangedIfUser(list, assocIn(state, ['servers', host, list], false))
};

var controls = {
	'cohort-summary': (state, cohorts) =>
		assocIn(state, ['datapages', 'cohorts'], cohorts),
	'cohort-datasets': (state, datasets, cohort) =>
		assocIn(state, ['datapages', 'cohort'], {cohort, datasets}),
	'dataset-meta': (state, [meta, links], host, dataset) =>
		assocIn(state, ['datapages', 'dataset'], {host, dataset, meta, ...links})
};

var getSection = ({dataset, host, cohort}) =>
	dataset && host ? 'dataset' :
	host ? 'hub' :
	cohort ? 'cohort' :
	'summary';

var needCohorts = state =>
	state.page === 'datapages' &&
	contains(['summary', 'hub'], getSection(state.params));

var hasCohorts = state => getIn(state, ['datapages', 'cohorts']);


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

	if (needCohorts(newState) && !hasCohorts(newState) &&
			(type === 'init' || !needCohorts(state))) {
		fetchCohortSummary(serverBus, newState);
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
