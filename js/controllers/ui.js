/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var kmModel = require('../models/km');
var {reifyErrors, collectResults} = require('./errors');
var {matchSamples, setCohort, fetchDatasets, fetchSamples, fetchColumnData} = require('./common');
var {nullField, xenaFieldPaths, setFieldType} = require('../models/fieldSpec');
var {getColSpec} = require('../models/datasetJoins');
var {setNotifications} = require('../notifications');
var fetchSamplesFrom = require('../samplesFrom');
var fetch = require('../fieldFetch');
var {remapFields, checkFieldExpression} = require('../models/searchSamples');
var {fetchInlineState} = require('../inlineState');

var identity = x => x;

var unionOfResults = resps => collectResults(resps, results => _.union(...results));

function cohortQuery(servers) {
	return Rx.Observable.zipArray(_.map(servers, s => reifyErrors(xenaQuery.all_cohorts(s), {host: s})))
			.flatMap(unionOfResults);
}

function fetchCohorts(serverBus, servers) {
	serverBus.onNext(['cohorts', cohortQuery(servers)]);
}

function fetchBookmark(serverBus, bookmark) {
	serverBus.onNext(['bookmark', Rx.DOM.ajax({
		method: 'GET',
		url: `/api/bookmarks/bookmark?id=${bookmark}`,
	}).map(r => r.response)]);
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
	'SV': mutationGeneLookup,
	'probes': probeLookup
};

// XXX need collectResults?
function allFieldsLookup(settings, xenaFields, state) {
	var fieldSpecs = _.map(xenaFields, path => _.getIn(settings, path));
	return Rx.Observable.zipArray(
		_.map(fieldSpecs, fs => reifyErrors(
			(fieldLookup[fs.fieldType] || probeLookup)(fs, state)), {/*host info?*/}));
}

function normalizeFields(serverBus, state, id, settings, isFirst) {
	var xenaFields = xenaFieldPaths(settings),
		lookup = allFieldsLookup(settings, xenaFields, state);
	serverBus.onNext(['normalize-fields', lookup, id, settings, isFirst, xenaFields]);
}

var featuresInCohort = (datasets, features, cohort) =>
		_.pick(features, (f, dsID) => datasets[dsID].cohort === cohort);

var survivalVarsForCohorts = (cohort, datasets, features) =>
	_.map(cohort, ({name}) =>
			kmModel.pickSurvivalVars(featuresInCohort(datasets, features, name)));

var hasSurvFields  = vars => !!(vars.ev && vars.tte && vars.patient);

var probeFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'float',
	fieldType: 'probes',
	fields: [name]
});

var codedFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'coded',
	fieldType: 'clinical',
	fields: [name]
});

var checkNullField = fn => field => field ? fn(field) : nullField;

function mapToObj(keys, fn) {
	return _.object(keys, _.map(keys, fn));
}

var survFields = ['ev', 'tte', 'patient'];
var getFieldSpec = _.object(survFields,
		[probeFieldSpec, probeFieldSpec, codedFieldSpec].map(checkNullField));

// XXX Note that we merge the 'patient' field across cohorts. This will
// be wrong in some cases, where 'patient' aliases, and right in other cases,
// such as TCGA patients in multiple cohorts.
function survivalFields(cohorts, datasets, features) {
	var vars = survivalVarsForCohorts(cohorts, datasets, features);
	return _.find(vars, hasSurvFields) ?  // at least one cohort w/surv data
		mapToObj(survFields, fname =>
				getColSpec(_.map(_.pluck(vars, fname), getFieldSpec[fname]), datasets))
		: null;
}

// If field set has changed, re-fetch.
function fetchSurvival(serverBus, state) {
	let {cohort, datasets, features, survival, cohortSamples} = state,
		fields = survivalFields(cohort, datasets, features),
		refetch = _.some(survFields,
				f => !_.isEqual(fields[f], _.getIn(survival, [f, 'field']))),

		queries = _.map(survFields, key => fetch(fields[key], cohortSamples)),
		collate = data => mapToObj(survFields,
				(k, i) => ({field: fields[k], data: data[i]}));

	// This could be optimized by grouping by server.
	refetch && serverBus.onNext([
			'km-survival-data', Rx.Observable.zipArray(...queries).map(collate)]);
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

function getChartOffsets(column) {
	return fetchSamplesFrom(column).flatMap(samples => fetch(column, samples)).map(data => {
		var fields = _.getIn(data, ['req', 'probes'], column.fields),
			values = _.getIn(data, ['req', 'values']);
		return _.object(fields, _.map(values, _.meannull));
	});
}

function setLoadingState(state) {
	var pending =  (state.bookmark || state.inlineState) ?
		_.assoc(state, 'loadPending', true) : state;
	return _.omit(pending, ['bookmark', 'inlineState']);
}

function fetchState(serverBus) {
	serverBus.onNext(['inlineState', fetchInlineState()]);
}

var controls = {
	init: state => setCohortPending(setServerPending(setLoadingState(state))),
	'init-post!': (serverBus, state, newState) => {
		if (state.inlineState) {
			fetchState(serverBus);
		} else if (state.bookmark) {
			fetchBookmark(serverBus, state.bookmark);
		} else {
			// XXX If we have servers.pending *and* cohortPending, there may be a race here.
			// We fetch the cohorts list, and the cohort data. If cohorts completes & the
			// cohort is not in new list, we reset cohort. Then the cohort data arrives (and
			// note there are several cascading queries).
			// Currently datapages + hub won't set cohortPending to a cohort not in the active hubs, so
			// we shouldn't hit this case.
			if (!state.cohorts || state.servers.pending && !_.isEqual(state.servers, state.servers.pending)) {
				fetchCohorts(serverBus, newState.servers.user);
			}
			if (shouldSetCohort(state)) {
				fetchCohortData(serverBus, newState);
			}
		}
	},
	cohort: (state, i, cohort) =>
		setCohort(state, _.assoc(state.cohort, i, {name: cohort})),
	'cohort-post!': (serverBus, state, newState) => fetchCohortData(serverBus, newState),
	'cohort-remove': (state, i) => setCohort(state, _.withoutIndex(state.cohort, i)),
	'cohort-remove-post!': (serverBus, state, newState) => fetchCohortData(serverBus, newState),
	'refresh-cohorts-post!': (serverBus, state) => fetchCohorts(serverBus, state.servers.user),
	samplesFrom: (state, i, samplesFrom) => _.assoc(state,
			'cohort', _.assocIn(state.cohort, [i, 'samplesFrom'], samplesFrom),
			'survival', null),
	'samplesFrom-post!': (serverBus, state, newState) => {
		let {servers: {user}, cohort} = newState;
		fetchSamples(serverBus, user, cohort);
	},
	sampleFilter: (state, i, sampleFilter) => _.assoc(state,
			'cohort', _.assocIn(state.cohort, [i, 'sampleFilter'], sampleFilter),
			'survival', null),
	'sampleFilter-post!': (serverBus, state, newState) => {
		let {servers: {user}, cohort} = newState;
		fetchSamples(serverBus, user, cohort);
	},
	'add-column-post!': (serverBus, state, newState, id, settings, isFirst) =>
		normalizeFields(serverBus, newState, id, settings, isFirst),
	resize: (state, id, {width, height}) =>
		_.assocInAll(state,
				['zoom', 'height'], height,
				['columns', id, 'width'], width),
	remove: (state, id) => {
		let ns = _.updateIn(state,
							["columns"], c => _.dissoc(c, id),
							["columnOrder"], co => _.without(co, id),
							["data"], d => _.dissoc(d, id)),
			nsSearch = _.assoc(ns, 'sampleSearch', remapFields(state.columnOrder, ns.columnOrder, state.sampleSearch));
		return matchSamples(nsSearch, nsSearch.sampleSearch);
	},
	order: (state, order) => _.assoc(state, 'columnOrder', order,
									 'sampleSearch', remapFields(state.columnOrder, order, state.sampleSearch)),
	zoom: (state, zoom) => warnZoom(_.assoc(state, "zoom", zoom)),
	'zoom-help-close': zoomHelpClose,
	'zoom-help-disable': zoomHelpClose,
	'zoom-help-disable-post!': (serverBus, state, newState) =>
		setNotifications(newState.notifications),
	reload: (state, id) => _.assocIn(state, ['data', id, 'status'], 'loading'),
	'reload-post!': (serverBus, state, newState, id) =>
		fetchColumnData(serverBus, newState.cohortSamples, id, _.getIn(newState, ['columns', id])),
	fieldType: (state, id, fieldType) =>
		_.updateIn(state,
				['columns', id], setFieldType(fieldType),
				['data', id, 'status'], () => 'loading'),
	'fieldType-post!': (serverBus, state, newState, id) =>
		fetchColumnData(serverBus, newState.cohortSamples, id, _.getIn(newState, ['columns', id])),
	// XXX wow, this is painful.
	vizSettings: (state, column, settings) => {
		var next = _.assocIn(state, ['columns', column, 'vizSettings'], settings),
			exp = state.sampleSearch;

		return exp ?
			_.assoc(next, 'sampleSearch',
				checkFieldExpression(
					state.columns[column],
					next.columns[column],
					column,
					state.columnOrder,
					state.data[column],
					exp)) :
			next;
	},
	'edit-dataset-post!': (serverBus, state, newState, dsID, meta) => {
		if (['mutationVector', 'clinicalMatrix'].indexOf(meta.type) === -1) {
			fetchExamples(serverBus, newState, dsID);
		}
	},
	'columnLabel': (state, dsID, value) =>
		_.assocIn(state, ['columns', dsID, 'user', 'columnLabel'], value),
	'fieldLabel': (state, dsID, value) =>
		_.assocIn(state, ['columns', dsID, 'user', 'fieldLabel'], value),
	'showIntrons': (state, dsID) =>
		_.updateIn(state, ['columns', dsID, 'showIntrons'], v => !v),
	'km-open': (state, id) => _.assocInAll(state,
			['km', 'id'], id,
			['km', 'title'], _.getIn(state, ['columns', id, 'user', 'columnLabel']),
			['km', 'label'], `Grouped by ${_.getIn(state, ['columns', id, 'user', 'fieldLabel'])}`),
	'km-open-post!': (serverBus, state, newState) => fetchSurvival(serverBus, newState, {}), // 2nd param placeholder for km.user
	'km-close': state => _.assocIn(state, ['km', 'id'], null),
	'km-cutoff': (state, value) => _.assocIn(state, ['km', 'cutoff'], value),
	'heatmap': state => _.assoc(state, 'mode', 'heatmap'),
	'chart': state => _.assoc(state, 'mode', 'chart'),
	'chart-set-state': (state, chartState) => _.assoc(state, 'chartState', chartState),
	'chart-set-average-cohort-post!': (serverBus, state, newState, id, thunk) =>
		serverBus.onNext(['chart-average-data', getChartOffsets(newState.columns[id]), thunk]),
	'chart-set-average-post!': (serverBus, state, newState, offsets, thunk) =>
		serverBus.onNext(['chart-average-data', Rx.Observable.return(offsets, Rx.Scheduler.timeout), thunk]),
	'sample-search': matchSamples,
	'vizSettings-open': (state, id) => _.assoc(state, 'openVizSettings', id)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
