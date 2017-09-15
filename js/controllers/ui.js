'use strict';

var _ = require('../underscore_ext');
var Rx = require('../rx');
var xenaQuery = require('../xenaQuery');
var kmModel = require('../models/km');
var {reifyErrors, collectResults} = require('./errors');
var {userServers, setCohort, fetchDatasets,
	fetchSamples, fetchColumnData} = require('./common');
var {nullField, setFieldType} = require('../models/fieldSpec');
var {getColSpec} = require('../models/datasetJoins');
var {setNotifications} = require('../notifications');
var fetchSamplesFrom = require('../samplesFrom');
var fetch = require('../fieldFetch');
var {remapFields} = require('../models/searchSamples');
var {fetchInlineState} = require('../inlineState');

var identity = x => x;

var unionOfResults = resps => collectResults(resps, results => _.union(...results));

function cohortQuery(servers) {
	return Rx.Observable.zipArray(_.map(servers, s => reifyErrors(xenaQuery.allCohorts(s), {host: s})))
			.flatMap(unionOfResults);
}

function fetchCohorts(serverBus, servers) {
	serverBus.next(['cohorts', cohortQuery(servers)]);
}

function fetchBookmark(serverBus, bookmark) {
	serverBus.next(['bookmark', Rx.Observable.ajax({
		responseType: 'text',
		method: 'GET',
		url: `/api/bookmarks/bookmark?id=${bookmark}`,
	}).map(r => r.response)]);
}

function exampleQuery(dsID, count) {
	return xenaQuery.datasetFieldExamples(dsID, count)
		.map(list => _.pluck(list, 'name'));
}

function fetchExamples(serverBus, dsID, count = 2) {
	serverBus.next(['columnEdit-examples', exampleQuery(dsID, count)]);
}

var {featureList} = xenaQuery;

function fetchFeatures(serverBus, dsID) {
	return serverBus.next(['columnEdit-features', featureList(dsID)]);
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
	refetch && serverBus.next([
			'km-survival-data', Rx.Observable.zipArray(...queries).map(collate)]);
}

var shouldSetCohort = state => (state.cohortPending && state.cohort !== state.cohortPending);

var setCohortPending = state =>
	shouldSetCohort(state) ?
		_.dissoc(setCohort(state, state.cohortPending), 'cohortPending') : state;

var resetServersChanged = state => _.dissoc(state, 'serversChanged');

var fetchCohortData = (serverBus, state) => {
	let user = userServers(state);
	fetchDatasets(serverBus, user, state.cohort);
	fetchSamples(serverBus, user, state.cohort, state.allowOverSamples);
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

function fetchCohortMeta(serverBus) {
	serverBus.next(['cohortMeta', xenaQuery.fetchCohortMeta]);
}

function fetchCohortPreferred(serverBus) {
	serverBus.next(['cohortPreferred', xenaQuery.fetchCohortPreferred]);
}

function setLoadingState(state, params) {
	var pending =  (_.get(params, 'bookmark') || _.get(params, 'inlineState')) ?
		_.assoc(state, 'loadPending', true) : state;
	return pending;
}

function fetchState(serverBus) {
	serverBus.next(['inlineState', fetchInlineState()]);
}

function setHubs(state, {hubs}) {
	return hubs ?
		hubs.reduce(
			(state, hub) =>_.assocIn(state, ['servers', hub, 'user'], true),
			state) :
		state;
}

function resetWizard(state) {
	return state.columnOrder.length > 2 ?
		_.assoc(state, 'wizardMode', false) : state;
}

// Fetches the gene strand info for a geneProbes field.
// We need the gene from one non-null field. This is
// probably broken in some way for composite views.
function fetchStrand(serverBus, state, id, gene, dsID) {
	var {probemap} = _.getIn(state, ['datasets', dsID]),
		{host} = JSON.parse(dsID);
	serverBus.next([['strand', id], xenaQuery.probemapGeneStrand(host, probemap, gene).catch(err => {console.log(err); return Rx.Observable.of('+');})]);
}

// Use min app width (1280px) if viewport width is currently smaller than min
// app width. (App is responsive above 1280px but components are snapped at a
// minimum width of 1280px)
var defaultWidth = viewportWidth => {
	var width = (viewportWidth < 1280 ? 1280 : viewportWidth);
	return Math.floor((width - 48) / 4) - 16; // Allow for 2 x 24px gutter on viewport, plus 16px margin for column
};

var controls = {
	init: (state, params) =>
		setCohortPending(
			resetServersChanged(
				setLoadingState(
					setHubs(state, params), params))),
	'init-post!': (serverBus, state, newState, params) => {
		var bookmark = _.get(params, 'bookmark'),
			inlineState = _.get(params, 'inlineState');
		if (inlineState) {
			fetchState(serverBus);
		} else if (bookmark) {
			fetchBookmark(serverBus, bookmark);
		} else {
			// XXX If we have serversChanged *and* cohortPending, there may be
			// a race here.  We fetch the cohorts list, and the cohort data. If
			// cohorts completes & the cohort is not in new list, we reset
			// cohort. Then the cohort data arrives (and note there are several
			// cascading queries).  Currently datapages + hub won't set
			// cohortPending to a cohort not in the active hubs, so we
			// shouldn't hit this case.
			if (!state.cohorts || params.hubs || state.serversChanged) {
				fetchCohorts(serverBus, userServers(newState));
			}
			if (shouldSetCohort(state)) {
				fetchCohortData(serverBus, newState);
			}
		}
		fetchCohortMeta(serverBus);
		fetchCohortPreferred(serverBus);
	},
	'import': (state, newState) => newState,
	cohort: (state, i, cohort, width) =>
		setCohort(state, _.assoc(state.cohort, i, {name: cohort}), width),
	cohortReset: state => _.assoc(setCohort(state, []), 'wizardMode', true, 'mode', 'heatmap'),
	'cohort-post!': (serverBus, state, newState) => fetchCohortData(serverBus, newState),
	'cohort-remove': (state, i) => setCohort(state, _.withoutIndex(state.cohort, i)),
	'cohort-remove-post!': (serverBus, state, newState) => fetchCohortData(serverBus, newState),
	'refresh-cohorts-post!': (serverBus, state) =>
		fetchCohorts(serverBus, userServers(state)),
	samplesFrom: (state, i, samplesFrom) => _.assoc(state,
			'cohort', _.assocIn(state.cohort, [i, 'samplesFrom'], samplesFrom),
			'survival', null),
	'samplesFrom-post!': (serverBus, state, newState) => {
		fetchSamples(serverBus, userServers(state), newState.cohort, newState.allowOverSamples);
	},
	sampleFilter: (state, i, sampleFilter) => _.assoc(state,
			'cohort', _.assocIn(state.cohort, [i, 'sampleFilter'], sampleFilter),
			'survival', null),
	'sampleFilter-post!': (serverBus, state, newState) =>
		fetchSamples(serverBus, userServers(newState), newState.cohort, newState.allowOverSamples),
	'add-column': (state, posOrId, ...idSettingsList) => {
		var {columnOrder, columns, sampleSearch, data} = state, // old settings
			isPos = _.isNumber(posOrId),
			pos = isPos ? posOrId : columnOrder.indexOf(posOrId) - 1,
			ids = _.pluck(idSettingsList, 'id'),
			settingsList = _.pluck(idSettingsList, 'settings'),
			newOrder = _.splice(columnOrder, pos + 1, isPos ? 0 : 1, ...ids),
			newState = _.assoc(state,
				'columns', _.merge(columns, _.object(ids, settingsList)),
				'columnOrder', newOrder,
				'sampleSearch', remapFields(columnOrder, newOrder, sampleSearch),
				'editing', null, // is editing always off after column add?
				'data', _.merge(data, _.object(ids, ids.map(_.constant({'status': 'loading'})))));
		return resetWizard(newState);
	},
	'add-column-post!': (serverBus, state, newState, pos, ...idSettingsList) => {
		idSettingsList.forEach(({id, settings}) => {
			// For geneProbes, fetch the gene model (just strand right now), and defer the
			// data fetch.
			if (settings.fieldType === 'geneProbes') {
				// Pick first fieldSpec, and 1st gene name.
				fetchStrand(serverBus, state, id, settings.fieldSpecs[0].fields[0], settings.fieldSpecs[0].dsID);
			} else {
				fetchColumnData(serverBus, state.cohortSamples, id, _.getIn(newState, ['columns', id]));
			}
		});
	},
	'edit-column': (state, editing) => _.assoc(state, 'editing', editing),
	resize: (state, id, {width, height}) =>
		_.assocInAll(state,
				['zoom', 'height'], height,
				['columns', id, 'width'], width),
	// If 'editing' is a blank column (isNumber), we need to decrement it
	// if it is higher than id index, to preserve its position in the order.
	remove: (state, id) => {
		var {columns, columnOrder, data, editing} = state,
			newEditing = _.isNumber(editing) &&
				editing >= state.columnOrder.indexOf(id) ? editing - 1 : editing,
			ns = _.assoc(state,
				'editing', newEditing,
				'columns', _.dissoc(columns, id),
				'columnOrder', _.without(columnOrder, id),
				'data', _.dissoc(data, id));
		return _.assoc(ns, 'sampleSearch', remapFields(state.columnOrder, ns.columnOrder, state.sampleSearch));
	},
	order: (state, order) => {
		// Filter out 'editing' columns
		var newOrder = order.filter(id => !_.isNumber(id)),
			editing = _.findIndexDefault(order.slice(1), _.isNumber, state.editing);
		return _.assoc(state, 'columnOrder', newOrder,
			'editing', editing,
			'sampleSearch', remapFields(state.columnOrder, order, state.sampleSearch));
	},
	zoom: (state, zoom) => warnZoom(_.assoc(state, "zoom", zoom)),
	'zoom-help-close': zoomHelpClose,
	'zoom-help-disable': zoomHelpClose,
	'zoom-help-disable-post!': (serverBus, state, newState) =>
		setNotifications(newState.notifications),
	'notifications-disable': (state, key) => _.assocIn(state, ['notifications', key], true),
	'notifications-disable-post!': (serverBus, state, newState) => setNotifications(newState.notifications),
	'notifications-enable': state => _.assoc(state, 'notifications', {}),
	'notifications-enable-post!': (serverBus, state, newState) => setNotifications(newState.notifications),
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
	vizSettings: (state, column, settings) =>
		_.assocIn(state, ['columns', column, 'vizSettings'], settings),
	'edit-dataset-post!': (serverBus, state, newState, dsID, meta) => {
		if (!_.contains(['mutationVector', 'clinicalMatrix', 'genomicSegment'],
				meta.type)) {
			fetchExamples(serverBus, dsID);
		}
		if (_.contains(['mutationVector', 'genomicSegment'], meta.type)) {
			fetchFeatures(serverBus, dsID);
		}
	},
	'columnLabel': (state, id, value) =>
		_.assocIn(state, ['columns', id, 'user', 'columnLabel'], value),
	'fieldLabel': (state, id, value) =>
		_.assocIn(state, ['columns', id, 'user', 'fieldLabel'], value),
	'showIntrons': (state, id) =>
		_.updateIn(state, ['columns', id, 'showIntrons'], v => !v),
	'sortVisible': (state, id, value) =>
		_.assocIn(state, ['columns', id, 'sortVisible'], value),
	'km-open': (state, id) => _.assocInAll(state,
			['km', 'id'], id,
			['km', 'title'], _.getIn(state, ['columns', id, 'user', 'columnLabel']),
			['km', 'label'], `Grouped by ${_.getIn(state, ['columns', id, 'user', 'fieldLabel'])}`),
	'km-open-post!': (serverBus, state, newState) => fetchSurvival(serverBus, newState, {}), // 2nd param placeholder for km.user
	'km-close': state => _.assocIn(state, ['km', 'id'], null),
	'km-cutoff': (state, value) => _.assocIn(state, ['km', 'cutoff'], value),
	'km-splits': (state, value) => _.assocIn(state, ['km', 'splits'], value),
	'heatmap': state => _.assoc(state, 'mode', 'heatmap'),
	'chart': state => _.assoc(state, 'mode', 'chart'),
	'chart-set-state': (state, chartState) => _.assoc(state, 'chartState', chartState),
	'chart-set-average-cohort-post!': (serverBus, state, newState, id, thunk) =>
		serverBus.next(['chart-average-data', getChartOffsets(newState.columns[id]), thunk]),
	'chart-set-average-post!': (serverBus, state, newState, offsets, thunk) =>
		serverBus.next(['chart-average-data', Rx.Observable.of(offsets, Rx.Scheduler.async), thunk]),
	'sample-search': (state, text) => _.assoc(state, 'sampleSearch', text),
	'vizSettings-open': (state, id) => _.assoc(state, 'openVizSettings', id),
	'sortDirection': (state, id, newDir) =>
		_.assocIn(state, ['columns', id, 'sortDirection'], newDir),
	'allowOverSamples': (state, aos) => _.assoc(state, 'allowOverSamples', aos),
	'allowOverSamples-post!': (serverBus, state, newState, aos) =>
		fetchSamples(serverBus, userServers(newState), newState.cohort, aos),
	showWelcome: (state, show) => _.assoc(state, 'showWelcome', show),
	wizardMode: (state, mode) => _.assoc(state, 'wizardMode', mode),
	viewportWidth: (state, width) => _.assoc(state, 'defaultWidth', defaultWidth(width)),
	// Due to wonky react-bootstrap handlers, xzoom can occur after remove, so
	// check that the column exists before updating.
	'xzoom': (state, id, xzoom) => _.updateIn(state, ['columns', id],
			c => c ? _.assoc(c, 'xzoom', xzoom) : c)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
