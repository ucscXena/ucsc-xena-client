/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var util = require('../util');
var kmModel = require('../models/km');
var {reifyErrors, collectResults} = require('./errors');
var {setCohort, fetchDatasets, fetchSamples, fetchColumnData} = require('./common');

var	datasetProbeValues = xenaQuery.dsID_fn(xenaQuery.dataset_probe_values);
var identity = x => x;

var unionOfResults = resps => collectResults(resps, results => _.union(...results));

function cohortQuery(servers) {
	return Rx.Observable.zipArray(_.map(servers, s => reifyErrors(xenaQuery.all_cohorts(s), {host: s})))
			.flatMap(unionOfResults);
}

function fetchCohorts(serverBus, servers) {
	serverBus.onNext(['cohorts', cohortQuery(servers)]);
}

function sortFeatures(features) {
	return _.map(features, (label, name) => ({value: name, label: label}))
		.sort((a, b) => util.caseInsensitiveSort(a.label, b.label));
}

// XXX shouldn't this just use the state.features data??
function featureQuery(dsID) {
	return xenaQuery.dsID_fn(xenaQuery.feature_list)(dsID)
		.map(list => sortFeatures(list));
}
function fetchFeatures(serverBus, state, dsID) {
	serverBus.onNext(['columnEdit-features', featureQuery(dsID)]);
}

function exampleQuery(dsID) {
	return xenaQuery.dsID_fn(xenaQuery.dataset_field_examples)(dsID)
		.map(list => _.pluck(list, 'name'));
}

function fetchExamples(serverBus, state, dsID) {
	serverBus.onNext(['columnEdit-examples', exampleQuery(dsID)]);
}

// Normalization of fields from user input
function geneProbeMapLookup(settings, state) {
	const {host} = JSON.parse(settings.dsID),
		probemap = state.datasets.datasets[settings.dsID].probemap;
	return  xenaQuery.sparse_data_match_genes(host, probemap, settings.fields);
}

function probeLookup(settings) {
	const {host, name} = JSON.parse(settings.dsID);
	return xenaQuery.match_fields(host, name, settings.fields);
}

function mutationGeneLookup(settings) {
	const {host, name} = JSON.parse(settings.dsID);
	return xenaQuery.sparse_data_match_genes(host, name, settings.fields);
}

const fieldLookup = {
	'geneProbesMatrix': geneProbeMapLookup,
	'geneMatrix': geneProbeMapLookup,
	'mutationVector': mutationGeneLookup,
	'probeMatrix': probeLookup
};

function normalizeFields(serverBus, state, id, settings) {
	var lookup = (fieldLookup[settings.dataType] || probeLookup)(settings, state);
	serverBus.onNext(['normalize-fields', lookup, id, settings]);
}

var datasetVar = (samples, {dsID, name}) =>
	datasetProbeValues(dsID, samples, [name]).map(_.first);

// data: [[val, ...], [val, ...], [val, ...]]
// data must be in order (event, tte, patient)
// returns { event: { sampleId: val, ... }, tte: ... }
var indexSurvivalData = (samples, missing, data) =>
	_.object(missing,
			_.map(data, v => _.object(samples, _.map(v, xenaQuery.nanstr))));


// XXX carry dsID/name through to km-survival-data, so we can verify we're holding
// the correct data before drawing.
function fetchSurvival(serverBus, state, km) {
	let {features, samples, survival} = state,
		// XXX 'user' is a placeholder for user override of survival vars, to be added
		// to the km ui.
		vars = kmModel.pickSurvivalVars(features, km.user),
		missing = ['ev', 'tte', 'patient'].filter(
				key => !_.isEqual(vars[key], _.getIn(survival, [key, 'field']))),
		queries = missing.map(key => datasetVar(samples, vars[key])),
		addField = fields => _.mapObject(fields, (data, key) => ({field: vars[key], data}));

	// This could be optimized by grouping by server. This would be easier
	// if we used proper hash-trie immutable data, where we could hash on dsID
	// instead of building a json encoding of dsID to allow hashing.
	serverBus.onNext([
			'km-survival-data',
			Rx.Observable.zipArray(...queries)
				.map(data => addField(indexSurvivalData(samples, missing, data)))]);
}

var shouldSetCohort = state => (state.cohortPending && state.cohort !== state.cohortPending);

var setCohortPending = state =>
	shouldSetCohort(state) ?
		_.dissoc(setCohort(state, state.cohortPending), 'cohortPending') : state;

var setServerPending = state =>
	state.servers.pending ?
	_.updateIn(state, ['servers'], s => _.dissoc(_.assoc(s, 'user', s.pending), 'pending')) :
	state;

var fetchCohortData = (serverBus, state, cohort) => {
	let {servers: {user}} = state,
		samplesFrom = _.get(state, "samplesFrom");
	fetchDatasets(serverBus, user, cohort);
	fetchSamples(serverBus, user, cohort, samplesFrom);
};

var controls = {
	init: state => setCohortPending(setServerPending(state)),
	'init-post!': (serverBus, state) => {
		// XXX If we have servers.pending *and* cohortPending, there may be a race here.
		// We fetch the cohorts list, and the cohort data. If cohorts completes & the
		// cohort is not in new list, we reset cohort. Then the cohort data arrives (and
		// note there are several cascading queries).
		// Currently datapages + hub won't set cohortPending to a cohort not in the active hubs, so
		// we shouldn't hit this case.
		if (!state.cohorts || state.servers.pending) {
			fetchCohorts(serverBus, state.servers.pending || state.servers.user);
		}
		if (shouldSetCohort(state)) {
			fetchCohortData(serverBus, state, state.cohortPending);
		}
	},
	cohort: setCohort,
	'cohort-post!': fetchCohortData,
	samplesFrom: (state, samplesFrom) => _.assoc(state, "samplesFrom", samplesFrom),
	'samplesFrom-post!': (serverBus, state, samplesFrom) => {
		let {servers: {user}} = state,
			cohort = _.get(state, "cohort");
		fetchSamples(serverBus, user, cohort, samplesFrom);
	},
	'add-column-post!': (serverBus, state, id, settings) =>
		normalizeFields(serverBus, state, id, settings),
	resize: (state, id, {width, height}) =>
		_.assocInAll(state,
				['zoom', 'height'], height,
				['columns', id, 'width'], width),
	remove: (state, id) => {
		let ns = _.updateIn(state, ["columns"], c => _.dissoc(c, id));
		ns = _.updateIn(ns, ["columnOrder"], co => _.without(co, id));
		return _.updateIn(ns, ["data"], d => _.dissoc(d, id));
	},
	order: (state, order) => _.assoc(state, "columnOrder", order),
	zoom: (state, zoom) => _.assoc(state, "zoom", zoom),
	dataType: (state, id, dataType) =>
		_.assocIn(state, ['columns', id, 'dataType'], dataType),
	// XXX note we recalculate columns[id] due to running side-effects independent of
	// the reducer.
	'dataType-post!': (serverBus, state, id, dataType) =>
		fetchColumnData(serverBus, state.samples, id, _.assoc(_.getIn(state, ['columns', id]), 'dataType', dataType)),
	vizSettings: (state, dsID, settings) =>
		_.assocIn(state, ['vizSettings', dsID], settings),
	'edit-dataset-post!': (serverBus, state, dsID, meta) => {
		if (meta.type === 'clinicalMatrix') {
			fetchFeatures(serverBus, state, dsID);
		} else if (meta.type !== 'mutationVector') {
			fetchExamples(serverBus, state, dsID);
		}
	},
	'columnLabel': (state, dsID, value) =>
		_.assocIn(state, ['columns', dsID, 'columnLabel', 'user'], value),
	'fieldLabel': (state, dsID, value) =>
		_.assocIn(state, ['columns', dsID, 'fieldLabel', 'user'], value),
	'km-open': (state, id) => _.assocInAll(state,
			['km', 'id'], id,
			['km', 'title'], _.getIn(state, ['columns', id, 'columnLabel', 'user']),
			['km', 'label'], `Grouped by ${_.getIn(state, ['columns', id, 'fieldLabel', 'user'])}`),
	'km-open-post!': (serverBus, state) => fetchSurvival(serverBus, state, {}), // 2nd param placeholder for km.user
	'km-close': state => _.assocIn(state, ['km', 'id'], null),
	'heatmap': state => _.assoc(state, 'mode', 'heatmap'),
	'chart': state => _.assoc(state, 'mode', 'chart'),
	'chart-set-state': (state, chartState) => _.assoc(state, 'chartState', chartState)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};
