// Helper methods needed by multiple controllers.

/*global require: false, module: false */

'use strict';
var Rx = require('rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');
var fetch = require('../fieldFetch');
var {allNullFields, nullField} = require('../models/fieldSpec');
var {getColSpec} = require('../models/datasetJoins');

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
	cohort.length > 0 ? samplesQuery(servers, cohort) : Rx.Observable.return([], Rx.Scheduler.timeout);

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

var closeEmptyColumns = state => {
	const {columns} = state,
		columnOrder = _.filter(state.columnOrder,
				id => !allNullFields(columns[id].fieldSpecs));
	return _.assoc(state,
				   'columnOrder', columnOrder,
				   'columns', _.pick(columns, columnOrder));
};

// This is all way too complex. We want to update the fieldSpecs in each column
// when something changes, e.g. active cohort list changes, available datasets
// changes, etc.
//
// The strategy here is
// 1 - set fields to nullField if they are unavailble
// 2 - drop empty columns (every field is nullField)
// 3 - recalculate getColSpec

// Recompute the composite field after the underlying fieldSpecs have
// changed.
var reJoinFields = (datasets, state) =>
	_.assoc(state, 'columns',
		_.mapObject(state.columns, c => _.merge(c, getColSpec(c.fieldSpecs, datasets))));

// Shuffle fieldSpecs for a column to align to new cohort list.
var remapFields = _.curry(
		(oldCohorts, fieldSpecs, {name}) => fieldSpecs[oldCohorts[name]] || nullField);

// Update all column fieldSpecs for new cohort list.
var updateColumnFields = _.curry(
	(cohorts, oldCohorts, column) =>
		_.assoc(column, 'fieldSpecs',
				_.map(cohorts, remapFields(oldCohorts, column.fieldSpecs))));

// Remap column fieldSpecs to reflect a new active cohort list.
// This will 1) drop fieldSpec for inactive cohorts, 2) move
// fieldSpec for still active cohorts, 3) insert nullField for
// newly active cohorts.
var remapFieldsForCohorts = (state, cohorts) => {
	var oldCohorts = _.object(_.pluck(state.cohort, 'name'),
			_.range(state.cohort.length));

	return _.assoc(state, 'columns',
		_.mapObject(state.columns, updateColumnFields(cohorts, oldCohorts)));
};

var setCohortRelatedFields = (state, cohorts) =>
	_.assoc(state,
		'cohort', cohorts,
		'samples', [],
		'cohortSamples', [],
		'data', {},
		'survival', null,
		'km', null);

var setCohort = (state, cohorts) =>
		resetZoom(
			reJoinFields(
				state.datasets,
				closeEmptyColumns(
					setCohortRelatedFields(
						remapFieldsForCohorts(state, cohorts),
						cohorts))));

module.exports = {
	fetchDatasets,
	fetchSamples,
	fetchColumnData,
	setCohort,
	resetZoom,
	reJoinFields,
	closeEmptyColumns
};
