// Helper methods needed by multiple controllers.

/*global require: false, module: false */

'use strict';
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');

var unionOfResults = resps => collectResults(resps, results => _.union(...results));

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


module.exports = {
	fetchDatasets,
	fetchSamples
};
