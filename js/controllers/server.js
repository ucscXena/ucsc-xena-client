/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');

var xenaQuery = require('../xenaQuery');
var datasetFeatures = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
var identity = x => x;

function resetZoom(state) {
	let count = _.get(state, "samples").length;
	return _.updateIn(state, ["zoom"],
					 z => _.merge(z, {count: count, index: 0}));
}

function fetchFeatures(serverBus, state, datasets) {
	var clinicalMatrices = _.flatmap(datasets.servers,
									 server => _.filter(server.datasets, ds => ds.type === 'clinicalMatrix')),
		dsIDs = _.pluck(clinicalMatrices, 'dsID');

	// XXX note that datasetFeatures takes optional args, so don't pass it directly
	// to map.
	serverBus.onNext(['features-slot',
				  Rx.Observable.zipArray(_.map(dsIDs, dsID => datasetFeatures(dsID)))
					  .map(features => ['features', _.object(dsIDs, features)])
	]);
}

var controls = {
	cohorts: (state, cohorts) => _.assoc(state, "cohorts", cohorts),
	datasets: (state, datasets) => _.assoc(state, "datasets", datasets),
	'datasets-post!': (serverBus, state, datasets) => fetchFeatures(serverBus, state, datasets),
	features: (state, features) => _.assoc(state, "features", features),
	samples: (state, samples) =>
		resetZoom(_.assoc(state, "samples", samples)),
	'widget-data': (state, data, id) =>
		_.assocIn(state, ["data", id], data),
	'columnEdit-features': (state, list) => _.assocIn(state, ["columnEdit", 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, ["columnEdit", 'examples'], list),
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};
