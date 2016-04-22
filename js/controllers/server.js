/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var {reifyErrors, collectResults} = require('./errors');
var {resetZoom, setCohort, fetchDatasets, fetchSamples, fetchColumnData} = require('./common');

var xenaQuery = require('../xenaQuery');
var datasetFeatures = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
var {updateFields} = require('../models/fieldSpec');
var identity = x => x;

function featuresQuery(datasets) {
	var clinicalMatrices = _.filter(datasets, ds => ds.type === 'clinicalMatrix'),
		dsIDs = _.pluck(clinicalMatrices, 'dsID');

	// XXX note that datasetFeatures takes optional args, so don't pass it directly
	// to map.
	return Rx.Observable.zipArray(
				_.map(dsIDs, dsID => reifyErrors(datasetFeatures(dsID), {dsID}))
			).flatMap(resps =>
				collectResults(resps, features => _.object(dsIDs, features)));
}

function fetchFeatures(serverBus, datasets) {
	serverBus.onNext(['features', featuresQuery(datasets)]);
}

var columnOpen = (state, id) => _.has(_.get(state, 'columns'), id);

// XXX
var resetCohort = state => /*_.contains(state.cohorts, state.cohort)*/ true ? state :
	setCohort(state, null);

var closeUnknownColumns = state => {
	const {datasets, columns} = state,
		columnOrder = _.filter(state.columnOrder, id => !!datasets[columns[id].dsID]);
	return _.assoc(state,
				   'columnOrder', columnOrder,
				   'columns', _.pick(columns, columnOrder));
};

var controls = {
	cohorts: (state, cohorts) => resetCohort(_.assoc(state, "cohorts", cohorts)),
	'cohorts-post!': (serverBus, state, newState) => {
		let {servers: {user}, cohort} = newState;
		if (cohort) {
			fetchSamples(serverBus, user, cohort);
			fetchDatasets(serverBus, user, cohort);
		}
	},
	datasets: (state, datasets) => closeUnknownColumns(_.assoc(state, "datasets", datasets)),
	'datasets-post!': (serverBus, state, newState, datasets) => fetchFeatures(serverBus, datasets),
	features: (state, features) => _.assoc(state, "features", features),
	samples: (state, samples) =>
		resetZoom(_.assoc(state,
						  'cohortSamples', samples,
						  'samples', _.range(_.sum(_.map(samples, c => c.length))))),
	'samples-post!': (serverBus, state, newState, samples) =>
		_.mapObject(_.get(newState, 'columns', {}), (settings, id) =>
				fetchColumnData(serverBus, samples, id, settings)),
	'normalize-fields': (state, fields, id, settings, xenaFields) => {
		var ns = _.assocIn(state, ['columns', id],
						   updateFields(settings, xenaFields, fields));
		return _.updateIn(ns, ["columnOrder"], co => _.conj(co, id));
	},
	'normalize-fields-post!': (serverBus, state, newState, fields, id) =>
		fetchColumnData(serverBus, state.cohortSamples, id, _.getIn(newState, ['columns', id])),
	// XXX Here we drop the update if the column is no longer open.
	'widget-data': (state, id, data) =>
		columnOpen(state, id) ?  _.assocIn(state, ["data", id], data) : state,
	'columnEdit-features': (state, list) => _.assocIn(state, ["columnEdit", 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, ["columnEdit", 'examples'], list),
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival),
	// XXX Here we should be updating application state. Instead we invoke a callback, because
	// chart.js can't handle passed-in state updates.
	'chart-average-data-post!': (serverBus, state, newState, offsets, thunk) => thunk(offsets)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
