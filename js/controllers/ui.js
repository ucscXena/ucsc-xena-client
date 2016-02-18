/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var widgets = require('../columnWidgets');
var util = require('../util');
var kmModel = require('../models/km');
var {reifyErrors, collectResults} = require('./errors');

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

var datasetSamples = xenaQuery.dsID_fn(xenaQuery.dataset_samples);

function samplesQuery(servers, cohort, samplesFrom) {
	return samplesFrom ?
				datasetSamples(samplesFrom) :
				Rx.Observable.zipArray(
					_.map(servers, s => reifyErrors(xenaQuery.all_samples(s, cohort), {host: s}))
				).flatMap(unionOfResults);
}

function fetchSamples(serverBus, servers, cohort, samplesFrom) {
	serverBus.onNext(['samples', samplesQuery(servers, cohort, samplesFrom)]);
}

var datasetResults = resps => collectResults(resps, servers => ({
	servers: servers,
	datasets: _.object(_.flatmap(servers, s => _.map(s.datasets, d => [d.dsID, d])))
}));

function datasetQuery(servers, cohort) {
	return Rx.Observable.zipArray(
		_.map(servers, server => reifyErrors(
				xenaQuery.dataset_list(server, cohort).map(datasets => ({server, datasets})),
				{host: server}))
	).flatMap(datasetResults)
}

function fetchDatasets(serverBus, servers, cohort) {
	serverBus.onNext(['datasets', datasetQuery(servers, cohort)]);
}

function fetchColumnData(serverBus, state, id, settings) {
	let samples = _.get(state, "samples");

	// XXX  Note that the widget-data-xxx slots are leaked in the groupBy
	// in main.js. We need a better mechanism.
	serverBus.onNext([['widget-data', id], widgets.fetch(settings, samples)]);
}

function sortFeatures(features) {
	return _.map(features, (label, name) => ({value: name, label: label}))
		.sort((a, b) => util.caseInsensitiveSort(a.label, b.label));
}

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

var controls = {
	'init-post!': (serverBus, state) => {
		let {servers: {user}} = state;
		fetchCohorts(serverBus, user);
	},
	cohort: (state, cohort) => _.assoc(state,
									   "cohort", cohort,
									   "samplesFrom", null,
									   "samples", [],
									   "columns", {},
									   "columnOrder", [],
									   "data", {},
									   "survival", null,
									   "km", null),
	'cohort-post!': (serverBus, state, cohort) => {
		let {servers: {user}} = state,
			samplesFrom = _.get(state, "samplesFrom");
		fetchDatasets(serverBus, user, cohort);
		fetchSamples(serverBus, user, cohort, samplesFrom);
	},
	samplesFrom: (state, samplesFrom) => _.assoc(state, "samplesFrom", samplesFrom),
	'samplesFrom-post!': (serverBus, state, samplesFrom) => {
		let {servers: {user}} = state,
			cohort = _.get(state, "cohort");
		fetchSamples(serverBus, user, cohort, samplesFrom);
	},
	'add-column': (state, id, settings) => {
		var ns = _.updateIn(state, ["columns"], s => _.assoc(s, id, settings));
		return _.updateIn(ns, ["columnOrder"], co => _.conj(co, id));
	},
	'add-column-post!': (serverBus, state, id, settings) =>
		fetchColumnData(serverBus, state, id, settings),
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
		fetchColumnData(serverBus, state, id, _.assoc(_.getIn(state, ['columns', id]), 'dataType', dataType)),
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
			['km', 'label'], _.getIn(state, ['columns', id, 'fieldLabel', 'user'])),
	'km-open-post!': (serverBus, state) => fetchSurvival(serverBus, state, {}), // 2nd param placeholder for km.user
	'km-close': (state) => _.assocIn(state, ['km', 'id'], null)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};
