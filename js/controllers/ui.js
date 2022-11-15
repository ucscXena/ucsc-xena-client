var _ = require('../underscore_ext').default;
var Rx = require('../rx').default;
import {defaultMap} from '../models/map';
var {userServers, setCohort, fetchSamples, fetchMap,
	fetchColumnData, fetchCohortData, fetchSurvival, fetchClustering} = require('./common');
var {setFieldType} = require('../models/fieldSpec');
var {setNotifications} = require('../notifications');
var {remapFields} = require('../models/searchSamples');
var {fetchInlineState} = require('../inlineState');
import {make, mount, compose} from './utils';
var {JSONToqueryString} = require('../dom_helper');
var {parseBookmark} = require('../bookmark');
import parseManifest from '../manifest';
var gaEvents = require('../gaEvents');
import * as columnsParam from '../columnsParam';
import {defaultState as chartDefaultState} from '../chart/utils';
var xenaQuery = require('../xenaQuery');

function fetchBookmark(serverBus, bookmark) {
	gaEvents('bookmark', 'load');
	serverBus.next(['bookmark', Rx.Observable.ajax({
		responseType: 'text',
		method: 'GET',
		url: `/api/bookmarks/bookmark?id=${bookmark}`
	}).map(r => parseBookmark(r.response))]);
}

function fetchManifest(serverBus, url) {
	serverBus.next(['manifest', Rx.Observable.ajax({
		responseType: 'text',
		method: 'GET',
		url
	}).map(r => parseManifest(r.response))]);
}

function fetchDatasetCohort(serverBus, {host, name}) {
	serverBus.next(['dataset-cohort', xenaQuery.datasetCohort(host, name)]);
}

var warnZoom = state => !_.getIn(state, ['notifications', 'zoomHelp']) ?
	_.assoc(state, 'zoomHelp', true) : state;

var zoomHelpClose = state =>
	_.assocIn(_.dissoc(state, 'zoomHelp'),
			['notifications', 'zoomHelp'], true);

var setLoadingState = (state, params) =>
	_.any(['bookmark', 'inlineState', 'columns'], p => _.get(params, p)) ?
		_.assoc(state, 'loadPending', true) : state;

var setMapLoading = state => _.Let(([dsID, {dimension}] = state.spreadsheet.map.map) =>
	state.spreadsheet.map.open ?
		_.updateIn(state, ['spreadsheet', 'map', 'data', dsID], data =>
			dimension.filter(dim => _.getIn(state.spreadsheet.map,
				['data', dsID, dim, 'status']) !== 'loaded')
			.reduce((data, dim) => _.assocIn(data, [dim, 'status'], 'loading'),
				data)) :
		state);

function fetchState(serverBus) {
	serverBus.next(['inlineState', fetchInlineState()]);
}

function resetWizard(state) {
	return state.columnOrder.length > 2 ?
		_.assoc(state, 'wizardMode', false) : state;
}

// Use min app width (1280px) if viewport width is currently smaller than min
// app width. (App is responsive above 1280px but components are snapped at a
// minimum width of 1280px)
export var defaultWidth = viewportWidth => {
	var width = (viewportWidth < 1280 ? 1280 : viewportWidth);
	return Math.min(448, Math.floor((width - 48) / 3) - 16); // Allow for 2 x 24px gutter on viewport, plus 16px margin for column (max width 448px).
};

// XXX This same info appears in Datapages.js, and in various links.
var getPage = path =>
	path === '/transcripts/' ? 'transcripts' :
	path === '/hub/' ? 'hub' :
	path === '/datapages/' ? 'datapages' :
	path === '/import/' ? 'import' :
	'heatmap';

var setPage = (state, path, params) =>
	_.assoc(state,
			'page', getPage(path),
			'params', params);

var paramList = params => _.isEmpty(params) ? '' : `?${JSONToqueryString(params)}`;

var controls = {
	init: (state, pathname = '/', params = {}) => {
		var next = setLoadingState(state, params),
			cohort = columnsParam.cohort(params.columns),
			page = setPage(next, pathname, params);
			setCohort(cohort);
		return cohort ?
			_.updateIn(page, ['spreadsheet'], setCohort({name: cohort})) :
			page;
	},
	'init-post!': (serverBus, state, newState, pathname, params = {}) => {
		var bookmark = _.get(params, 'bookmark'),
			cohort = columnsParam.cohort(params.columns),
			inlineState = _.get(params, 'inlineState'),
			manifest = _.get(params, 'manifest');
		if (inlineState) {
			fetchState(serverBus);
		} else if (bookmark) {
			fetchBookmark(serverBus, bookmark);
		} else if (cohort) {
			fetchCohortData(serverBus, newState.spreadsheet);
		} else if (params.columns) { // have columns but no cohort
			// All cohorts must match, so take the first one &
			// later filter any datasets not in the cohort.
			fetchDatasetCohort(serverBus, params.columns[0]);
		}
		if (manifest) { // not sure why this is separate. bookmark + manifest??
			fetchManifest(serverBus, manifest);
		}
	},
	navigate: (state, page, params = {}) => _.assoc(state, 'page', page, 'params', params),
	'navigate-post!': (serverBus, state, newState, page, params) => history.pushState({}, '', `/${page}/${paramList(params)}`),
	history: (state, history) => _.isEmpty(history) ? state :
		_.Let(({path, params = {}} = history) =>
			_.assoc(state, 'page', getPage(path), 'params', params)),
	cohort: (state, cohort, width) =>
		_.updateIn(state, ['spreadsheet'], setCohort({name: cohort}, width)),
	'cohort-post!': (serverBus, state, newState) =>
		// XXX just samples, now
		fetchCohortData(serverBus, newState.spreadsheet),
	cohortReset: state =>
		_.updateIn(state, ['spreadsheet'], setCohort(undefined, undefined)),
	'import': (state, newState) => _.merge(state, newState),
	'import-error': state => _.assoc(state, 'stateError', 'import'),
	stateError: (state, error) => _.assoc(state, 'stateError', error),
	'km-open-post!': (serverBus, state, newState) => fetchSurvival(serverBus, newState, {}), // 2nd param placeholder for km.user
	'localStatus': (state, stat) => _.assoc(state, 'localStatus', stat),
	// ui will open map... requires selected map information, and any
	// settings. Also need the data
	'map': (state, open) =>
		setMapLoading(_.updateIn(state, ['spreadsheet', 'map'], (mapState = {}) =>
			_.merge(_.assoc(mapState, 'open', open),
				open ? defaultMap(state.spreadsheet.cohort,
					state.wizard.cohortDatasets, mapState) : {}))),
	'map-post!': (serverBus, state, newState, open) => {
		if (open) {
			fetchMap(serverBus, newState);
		}
	},
	'map-select': (state, map) => setMapLoading(_.assocIn(state,
		['spreadsheet', 'map', 'map'], map,
		['spreadsheet', 'map', 'view'], undefined)),
	'map-select-post!': (serverBus, state, newState) => {
		fetchMap(serverBus, newState);
	},
	'map-color': (state, column) =>
		_.assocIn(state, ['spreadsheet', 'map', 'colorColumn'], column),
	'map-hide-codes': (state, hidden) =>
		_.assocIn(state, ['spreadsheet', 'map', 'hidden',
			state.spreadsheet.map.colorColumn], hidden),
	'map-view': (state, view) =>
		_.assocIn(state, ['spreadsheet', 'map', 'view'], view)
};

var spreadsheetControls = {
	'refresh-cohorts-post!': (serverBus, state, newState) => {
		// reload samples
		fetchCohortData(serverBus, newState);
	},
	cluster: (state, id, value) =>
		_.assocIn(state, ['columns', id, 'clustering'], value),
	'cluster-post!': (serverBus, state, newState, id, value, data) => {
		if (value != null && _.getIn(newState, ['data', id, 'clustering', 'probes']) == null) {
			fetchClustering(serverBus, newState, id, data);
		}
	},
	searchHistory: (state, search) => _.updateIn(state, ['searchHistory'],
			// put at front, limit length, and make unique
			history => _.uniq([search].concat((history || [])).slice(0, 20))),
	sampleFilter: (state, sampleFilter) => _.assocIn(state,
			['cohort', 'sampleFilter'], sampleFilter,
			['map', 'data'], null,
			['survival'], null),
	'sampleFilter-post!': (serverBus, state, newState) =>
		fetchSamples(serverBus, userServers(newState), newState.cohort, newState.allowOverSamples),
	'addColumnAddHover': (state, hovering) => _.assoc(state, 'addColumnAddHover', hovering),
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
				'searchHistory', state.searchHistory &&
					state.searchHistory.map(remapFields(columnOrder, newOrder)),
				'editing', null, // is editing always off after column add?
				'data', _.merge(data, _.object(ids, ids.map(_.constant({'status': 'loading'})))));
		return resetWizard(newState);
	},
	'add-column-post!': (serverBus, state, newState, pos, ...idSettingsList) => {
		idSettingsList.forEach(({id}) =>
			fetchColumnData(serverBus, state.cohortSamples, id, _.getIn(newState, ['columns', id])));
	},
	'enableTransition': (state, value) => _.assoc(state, 'enableTransition', value),
	'edit-column': (state, editing) => _.assoc(state, 'editing', editing),
	resize: (state, id, {width, height}) =>
		_.assocInAll(state,
				['zoom', 'height'], Math.round(height),
				['columns', id, 'width'], Math.round(width)),
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
		return _.assoc(ns,
				'sampleSearch', remapFields(state.columnOrder, ns.columnOrder, state.sampleSearch),
				'searchHistory', state.searchHistory &&
					state.searchHistory.map(remapFields(state.columnOrder, ns.columnOrder)));
	},
	order: (state, order) => {
		// Filter out 'editing' columns
		var newOrder = order.filter(id => !_.isNumber(id)),
			editing = _.findIndexDefault(order.slice(1), _.isNumber, state.editing);
		return _.assoc(state, 'columnOrder', newOrder,
			'editing', editing,
			'sampleSearch', remapFields(state.columnOrder, order, state.sampleSearch),
			'searchHistory', state.searchHistory &&
				state.searchHistory.map(remapFields(state.columnOrder, order)));
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
	vizSettings: (state, column, settings) =>
		_.assocIn(state, ['columns', column, 'vizSettings'], settings),
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
			['km', 'label'], _.getIn(state, ['columns', id, 'user', 'fieldLabel']),
			['km', 'survivalType'], _.intersection([_.getIn(state, ['km', 'survivalType'])], _.keys(_.getIn(state, ['survival']))) [0]),
	// see km-open-post! in controls, above. Requires wizard.cohortFeatures.
	'km-close': state => _.assocIn(state, ['km', 'id'], null),
	'km-cutoff': (state, value) => _.assocIn(state, ['km', 'cutoff'], value),
	'km-splits': (state, value) => _.assocIn(state, ['km', 'splits'], value),
	'km-survivalType': (state, value) => _.assocIn(state, ['km', 'survivalType'], value),
	'heatmap': state => _.assocInAll(state,
		['mode'], 'heatmap',
		['chartState', 'setColumn'], null),
	'chart': (state, id) => chartDefaultState(_.assocIn(state,
				['mode'], 'chart',
				['chartState', 'setColumn'], id)),
	'chart-set-state': (state, chartState) => chartDefaultState(
			_.assoc(state, 'chartState', chartState)),
	'sample-search': (state, text, selection) =>
		_.assoc(state, 'sampleSearch', text, 'sampleSearchSelection', selection),
	// XXX maybe this should be transient state, instead, since it's not
	// meaningful after reload?
	'highlightSelect': (state, highlight) => _.assoc(state, 'highlightSelect', highlight),
	'vizSettings-open': (state, id) => _.assoc(state, 'openVizSettings', id),
	'sortDirection': (state, id, newDir) =>
		_.assocIn(state, ['columns', id, 'sortDirection'], newDir),
	'allowOverSamples': (state, aos) => _.assocIn(state, ['allowOverSamples'], aos,
		['map', 'data'], null),
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

export default compose(
	mount(make(spreadsheetControls), ['spreadsheet']),
	make(controls));
