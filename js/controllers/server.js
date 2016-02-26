/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
var Rx = require('rx');
var {reifyErrors, collectResults} = require('./errors');
var {fetchDatasets, fetchSamples, fetchColumnData} = require('./common');

var xenaQuery = require('../xenaQuery');
var datasetFeatures = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
var identity = x => x;

function resetZoom(state) {
	let count = _.get(state, "samples").length;
	return _.updateIn(state, ["zoom"],
					 z => _.merge(z, {count: count, index: 0}));
}

function featuresQuery(datasets) {
	var clinicalMatrices = _.flatmap(datasets.servers,
			server => _.filter(server.datasets, ds => ds.type === 'clinicalMatrix')),
		dsIDs = _.pluck(clinicalMatrices, 'dsID');

	// XXX note that datasetFeatures takes optional args, so don't pass it directly
	// to map.
	return Rx.Observable.zipArray(
				_.map(dsIDs, dsID => reifyErrors(datasetFeatures(dsID), {dsID}))
			).flatMap(resps =>
				collectResults(resps, features => _.object(dsIDs, features)));
}

function fetchFeatures(serverBus, state, datasets) {
	serverBus.onNext(['features', featuresQuery(datasets)]);
}

var columnOpen = (state, id) => _.has(_.get(state, 'columns'), id);

var controls = {
	cohorts: (state, cohorts) => _.assoc(state, "cohorts", cohorts),
	'cohorts-post!': (serverBus, state) => {
		let {servers: {user}, cohort, samplesFrom, samples, datasets} = state;
		if (cohort && !samples) {
			fetchSamples(serverBus, user, cohort, samplesFrom);
		}
		if (cohort && !datasets) {
			fetchDatasets(serverBus, user, cohort);
		}
	},
	datasets: (state, datasets) => _.assoc(state, "datasets", datasets),
	'datasets-post!': (serverBus, state, datasets) => fetchFeatures(serverBus, state, datasets),
	features: (state, features) => _.assoc(state, "features", features),
	samples: (state, samples) =>
		resetZoom(_.assoc(state, "samples", samples)),
	'samples-post!': (serverBus, state, samples) =>
		_.mapObject(_.getIn(state, ['columns'], []), (settings, id) =>
				fetchColumnData(serverBus, samples, id, settings)),
	'normalize-fields': (state, fields, id, settings) => {
		var ns = _.updateIn(state, ["columns"], s => _.assoc(s, id, _.assoc(settings, 'fields', fields)));
		return _.updateIn(ns, ["columnOrder"], co => _.conj(co, id));
	},
	// XXX note we recalc settings due to not having the new state.
	'normalize-fields-post!': (serverBus, state, fields, id, settings) =>
		fetchColumnData(serverBus, state.samples, id, _.assoc(settings, 'fields', fields)),
	// XXX Here we drop the update if the column is no longer open.
	'widget-data': (state, id, data) =>
		columnOpen(state, id) ?  _.assocIn(state, ["data", id], data) : state,
	'columnEdit-features': (state, list) => _.assocIn(state, ["columnEdit", 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, ["columnEdit", 'examples'], list),
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, ...args)
};
