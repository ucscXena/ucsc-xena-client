// Helper methods needed by multiple controllers.

/*global require: false, module: false */

'use strict';
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');
var fetch = require('../fieldFetch');

var datasetResults = resps => collectResults(resps, servers =>
		_.object(_.flatmap(servers, s => _.map(s.datasets, d => [d.dsID, d]))));

function datasetQuery(servers, cohort) {
	var cohorts = _.pluck(cohort, 'name');
	return Rx.Observable.zipArray(
		_.map(servers, server => reifyErrors(
				xenaQuery.dataset_list(server, cohorts).map(datasets => ({server, datasets})),
				{host: server}))
	).flatMap(datasetResults);
}

function fetchDatasets(serverBus, servers, cohort) {
	serverBus.onNext(['datasets', datasetQuery(servers, cohort)]);
}

var datasetSamples = xenaQuery.dsID_fn(xenaQuery.dataset_samples);
var allSamples = _.curry((cohort, server) => xenaQuery.all_samples(server, cohort));

function unionOfGroup(gb) {
	return _.union(..._.map(gb, ([, v]) => v));
}

// For the cohort, either fetch samplesFrom, or query all servers,
// Return a stream per-cohort, each of which returns an event
// [cohort, [sample, ...]].
// By not combining them here, we can uniformly handle errors, below.
var cohortSamplesQuery = _.curry(
	(servers, {name, samplesFrom}, i) =>
		(samplesFrom ?
			[datasetSamples(samplesFrom)] :
			_.map(servers, allSamples(name))).map(resp => resp.map(samples => [i, samples])));

var collateSamplesByCohort = _.curry((cohorts, resps) => {
	var byCohort = _.groupBy(resps, _.first);
	return _.map(cohorts, (c, i) => unionOfGroup(byCohort[i] || []));
});

// reifyErrors should be pass the server name, but in this expression we don't have it.
function samplesQuery(servers, cohort) {
	return Rx.Observable.zipArray(_.flatmap(cohort, cohortSamplesQuery(servers)).map(reifyErrors))
		.flatMap(resps => collectResults(resps, collateSamplesByCohort(cohort)));
}

// query samples if non-empty cohorts
var neSamplesQuery = (servers, cohort) =>
	cohort.length > 0 ? samplesQuery(servers, cohort) : Rx.Observable.return([], Rx.Scheduler.currentThread);

function fetchSamples(serverBus, servers, cohort) {
	serverBus.onNext(['samples', neSamplesQuery(servers, cohort)]);
}

function fetchColumnData(serverBus, samples, id, settings) {

	// XXX  Note that the widget-data-xxx slots are leaked in the groupBy
	// in main.js. We need a better mechanism.
	serverBus.onNext([['widget-data', id], fetch(settings, samples)]);
}

function resetZoom(state) {
	let count = _.get(state, "samples").length;
	return _.updateIn(state, ["zoom"],
					 z => _.merge(z, {count: count, index: 0}));
}

var setCohort = (state, cohorts) =>
	resetZoom(_.assoc(state,
				"cohort", cohorts,
				"data", {},
				"survival", null,
				"km", null));

module.exports = {
	fetchDatasets,
	fetchSamples,
	fetchColumnData,
	setCohort,
	resetZoom
};
