/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var kmModel = require('../models/km');
var {reifyErrors, collectResults} = require('./errors');
var {setCohort, fetchDatasets, fetchSamples, fetchColumnData} = require('./common');
var {xenaFieldPaths} = require('../models/fieldSpec');
var {setNotifications} = require('../notifications');

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
		probemap = state.datasets[settings.dsID].probemap;
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
	'geneProbes': geneProbeMapLookup,
	'genes': geneProbeMapLookup,
	'mutation': mutationGeneLookup,
	'probes': probeLookup
};

function allFieldsLookup(settings, xenaFields, state) {
	var fieldSpecs = _.map(xenaFields, path => _.getIn(settings, path));
	return Rx.Observable.zipArray(
		_.map(fieldSpecs, fs => reifyErrors(
			(fieldLookup[fs.fieldType] || probeLookup)(fs, state)), {/*host info?*/}));
}

function normalizeFields(serverBus, state, id, settings) {
	var xenaFields = xenaFieldPaths(settings),
		lookup = allFieldsLookup(settings, xenaFields, state);
	serverBus.onNext(['normalize-fields', lookup, id, settings, xenaFields]);
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

var fetchCohortData = (serverBus, state) => {
	let {servers: {user}, cohort} = state;
	fetchDatasets(serverBus, user, cohort);
	fetchSamples(serverBus, user, cohort);
};

var warnZoom = state => !_.getIn(state, ['notifications', 'zoomHelp']) ?
	_.assoc(state, 'zoomHelp', true) : state;

var zoomHelpClose = state =>
	_.assocIn(_.dissoc(state, 'zoomHelp'),
			['notifications', 'zoomHelp'], true);

var controls = {
	init: state => setCohortPending(setServerPending(state)),
	'init-post!': (serverBus, state, newState) => {
		// XXX If we have servers.pending *and* cohortPending, there may be a race here.
		// We fetch the cohorts list, and the cohort data. If cohorts completes & the
		// cohort is not in new list, we reset cohort. Then the cohort data arrives (and
		// note there are several cascading queries).
		// Currently datapages + hub won't set cohortPending to a cohort not in the active hubs, so
		// we shouldn't hit this case.
		if (!state.cohorts || state.servers.pending) {
			fetchCohorts(serverBus, newState.servers.user);
		}
		if (shouldSetCohort(state)) {
			fetchCohortData(serverBus, newState);
		}
	},
	cohort: setCohort,
	'cohort-post!': (serverBus, state, newState) => fetchCohortData(serverBus, newState),
	'refresh-cohorts-post!': (serverBus, state) => fetchCohorts(serverBus, state.servers.user),
	samplesFrom: (state, i, samplesFrom) => _.assoc(state,
			'cohort', _.assocIn(state.cohort, [i, 'samplesFrom'], samplesFrom),
			'survival', null),
	'samplesFrom-post!': (serverBus, state, newState, i, samplesFrom) => {
		let {servers: {user}, cohort} = newState;
		fetchSamples(serverBus, user, cohort, samplesFrom);
	},
	'add-column-post!': (serverBus, state, newState, id, settings) =>
		normalizeFields(serverBus, newState, id, settings),
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
	zoom: (state, zoom) => warnZoom(_.assoc(state, "zoom", zoom)),
	'zoom-help-close': zoomHelpClose,
	'zoom-help-disable': zoomHelpClose,
	'zoom-help-disable-post!': (serverBus, state, newState) =>
		setNotifications(newState.notifications),
	fieldType: (state, id, fieldType) =>
		_.assocIn(state, ['columns', id, 'fieldType'], fieldType),
	'fieldType-post!': (serverBus, state, newState, id) =>
		fetchColumnData(serverBus, newState.cohortSamples, id, _.getIn(newState, ['columns', id])),
	vizSettings: (state, column, settings) =>
		_.assocIn(state, ['columns', column, 'vizSettings'], settings),
	'edit-dataset-post!': (serverBus, state, newState, dsID, meta) => {
		if (['mutationVector', 'clinicalMatrix'].indexOf(meta.type) === -1) {
			fetchExamples(serverBus, newState, dsID);
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
	'km-open-post!': (serverBus, state, newState) => fetchSurvival(serverBus, newState, {}), // 2nd param placeholder for km.user
	'km-close': state => _.assocIn(state, ['km', 'id'], null),
	'heatmap': state => _.assoc(state, 'mode', 'heatmap'),
	'chart': state => _.assoc(state, 'mode', 'chart'),
	'chart-set-state': (state, chartState) => _.assoc(state, 'chartState', chartState)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
