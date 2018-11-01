'use strict';

var _ = require('../underscore_ext');
var {resetZoom, fetchColumnData, fetchCohortData, setCohort, fetchClustering} = require('./common');

var {compose, make, mount} = require('./utils');

var columnOpen = (state, id) => _.has(_.get(state, 'columns'), id);

var resetLoadPending = state => _.dissoc(state, 'loadPending');

var controls = {
	// XXX was clearWizardCohort just cleaning up bad bookmarks? Do we need to handle that case?
	// How do we handle cohortSamples reloading generally, and with respect to restoring state?
	bookmark: (state, bookmark) => resetLoadPending(_.merge(state, bookmark)),
	'bookmark-error': state => resetLoadPending(_.assoc(state, 'stateError', 'bookmark')),
	// Here we need to load cohort data if servers or cohort has changed,
	// *or* if we never loaded cohort data (e.g. due to waiting on bookmark).
	'manifest': (state, {cohort, samples}) =>
		_.updateIn(state, ['spreadsheet'], setCohort({name: cohort, sampleFilter: samples}, null)),
	'manifest-post!': (serverBus, state, newState) =>
		// just samples now
		fetchCohortData(serverBus, newState.spreadsheet),
	inlineState: (state, newState) => resetLoadPending(newState)
};

var spreadsheetControls = {
	samples: (state, {samples, over, hasPrivateSamples}) => {
		var newState = resetZoom(_.assoc(state,
					'cohortSamples', samples,
					'samplesOver', over,
					'hasPrivateSamples', hasPrivateSamples)),
			{columnOrder} = newState;
		return _.reduce(
				columnOrder,
				(acc, id) => _.assocIn(acc, ['data', id, 'status'], 'loading'),
				newState);
	},
	'samples-post!': (serverBus, state, newState, {samples}) =>
		_.mapObject(_.get(newState, 'columns', {}), (settings, id) =>
				fetchColumnData(serverBus, samples, id, settings)),
	// XXX Here we drop the update if the column is no longer open.
	'widget-data': (state, id, data) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id], _.assoc(data, 'status', 'loaded'))
			: state,
	'widget-data-post!': (serverBus, state, newState, id) => {
		if (_.getIn(newState, ['columns', id, 'clustering']) != null) {
			fetchClustering(serverBus, newState, id);
		}
	},
	'cluster-result': (state, id, order) =>
		_.assocIn(state, ['data', id, 'clustering', 'probes'], order),
	'widget-data-error': (state, id) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id, 'status'], 'error') : state,
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival),
	// XXX Here we should be updating application state. Instead we invoke a callback, because
	// chart.js can't handle passed-in state updates.
	'chart-average-data-post!': (serverBus, state, newState, offsets, thunk) => thunk(offsets)
};

module.exports = compose(
		make(controls),
		mount(make(spreadsheetControls), ['spreadsheet']));
