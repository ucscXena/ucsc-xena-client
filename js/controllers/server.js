/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
var paths = require('./paths');
var Rx = require('rx');

var xenaQuery = require('../xenaQuery');
var datasetFeatures = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
var identity = x => x;

function resetZoom(state) {
	let count = _.getIn(state, paths.samples).length;
	return _.updateIn(state, paths.zoom,
					 z => _.merge(z, {count: count, index: 0}));
}

function fetchFeatures(state, datasets) {
	let {comms: {server}} = state;

	var clinicalMatrices = _.flatmap(datasets.servers,
									 server => _.filter(server.datasets, ds => ds.type === 'clinicalMatrix')),
		dsIDs = _.pluck(clinicalMatrices, 'dsID');

	// XXX note that datasetFeatures takes optional args, so don't pass it directly
	// to map.
	server.onNext(['features-slot',
				  Rx.Observable.zipArray(_.map(dsIDs, dsID => datasetFeatures(dsID)))
					  .map(features => ['features', _.object(dsIDs, features)])
	]);
}

var serverController = {
	cohorts: (state, cohorts) => _.assocIn(state, paths.cohorts, cohorts),
	datasets: (state, datasets) => _.assocIn(state, paths.datasets, datasets),
	'datasets-post!': (previoius, current, datasets) => fetchFeatures(current, datasets),
	features: (state, features) => _.assocIn(state, paths.features, features),
	samples: (state, samples) =>
		resetZoom(_.assocIn(state, paths.samples, samples)),
	'widget-data': (state, data, id) =>
		_.assocIn(state, [...paths.data, id], data),
	'columnEdit-features': (state, list) => _.assocIn(state, [...paths.columnEdit, 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, [...paths.columnEdit, 'examples'], list),
	'km-survival-data': (state, survival) => ({...state, survival})
};

module.exports = {
	event: (state, [tag, ...args]) => (serverController[tag] || identity)(state, ...args),
	postEvent: (previous, current, [tag, ...args]) => (serverController[tag + '-post!'] || identity)(previous, current, ...args)
};
