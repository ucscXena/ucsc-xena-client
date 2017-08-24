'use strict';

// Helper methods needed by multiple controllers.

var Rx = require('../rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');
var fetch = require('../fieldFetch');
var {allNullFields, nullField} = require('../models/fieldSpec');
var {getColSpec} = require('../models/datasetJoins');
var {signatureField} = require('../models/fieldSpec');
var {getColSpec} = require('../models/datasetJoins');
// pick up signature fetch
require('../models/signatures');

var datasetResults = resps => collectResults(resps, servers =>
		_.object(_.flatmap(servers, s => _.map(s.datasets, d => [d.dsID, d]))));

function datasetQuery(servers, cohort) {
	var cohorts = _.pluck(cohort, 'name');
	return Rx.Observable.zipArray(
		_.map(servers, server => reifyErrors(
				xenaQuery.datasetList(server, cohorts).map(datasets => ({server, datasets})),
				{host: server}))
	).flatMap(datasetResults);
}

function fetchDatasets(serverBus, servers, cohort) {
	serverBus.next(['datasets', datasetQuery(servers, cohort)]);
}

// Might want to bump this up after fixing our rendering problems @ 40k.
const MAX_SAMPLES = 30 * 1000;

var {datasetSamples} = xenaQuery;
var allSamples = _.curry((cohort, max, server) => xenaQuery.cohortSamples(server, cohort, max === Infinity ? null : max));

function unionOfGroup(gb) {
	return _.union(..._.map(gb, ([, v]) => v));
}

function filterSamples(sampleFilter, samples) {
	return sampleFilter ? _.intersection(sampleFilter, samples) : samples;
}

// For the cohort, either fetch samplesFrom, or query all servers,
// Return a stream per-cohort, each of which returns an event
// [cohort, [sample, ...]].
// By not combining them here, we can uniformly handle errors, below.
var cohortSamplesQuery = _.curry(
	(servers, max, {name, samplesFrom, sampleFilter}, i) =>
		(samplesFrom ?
			[datasetSamples(samplesFrom, max)] :
			_.map(servers, allSamples(name, max)))
		.map(resp => resp.map(samples => [i, filterSamples(sampleFilter, samples), samples.length >= max])));

// XXX The use of 'i' here looks wrong: it should be the cohort index, to line up with 'cohorts',
// but collectResults may have dropped a response due to ajax error, shifting the indexes of cohorts
// after the error.
// XXX Regarding MAX_SAMPLES, this query operates like this: for each cohort, for each server, fetch
// the sample list, and collate the results. To enforce MAX_SAMPLES and avoid hammering the server we
// should 1) limit each (cohort, server) request to MAX_SAMPLES, 2) limit the union per-cohort to MAX_SAMPLES,
// 3) limit the combined (all cohort) list to MAX_SAMPLES. The latter is harder to do because we can't
// just slice the list of lists. Currently we only enforce 1 & 2.
var collateSamplesByCohort = _.curry((cohorts, max, resps) => {
	var byCohort = _.groupBy(resps, _.first),
		serverOver = _.any(resps, ([,, over]) => over),
		cohortSamples = _.map(cohorts, (c, i) => unionOfGroup(byCohort[i] || []).slice(0, max)),
		cohortOver = _.any(cohortSamples, samples => samples.length >= max);
	return {samples: cohortSamples, over: serverOver || cohortOver};
});

// reifyErrors should be pass the server name, but in this expression we don't have it.
function samplesQuery(servers, cohort, max) {
	return Rx.Observable.zipArray(_.flatmap(cohort, cohortSamplesQuery(servers, max)).map(reifyErrors))
		.flatMap(resps => collectResults(resps, collateSamplesByCohort(cohort, max)));
}

// query samples if non-empty cohorts
var neSamplesQuery = (servers, cohort, max) =>
	cohort.length > 0 ? samplesQuery(servers, cohort, max) : Rx.Observable.of({samples: [], over: false}, Rx.Scheduler.asap);

function fetchSamples(serverBus, servers, cohort, allowOverSamples) {
	serverBus.next(['samples', neSamplesQuery(servers, cohort, allowOverSamples ? Infinity : MAX_SAMPLES)]);
}

function fetchColumnData(serverBus, samples, id, settings) {

	// XXX  Note that the widget-data-xxx slots are leaked in the groupBy
	// in main.js. We need a better mechanism.
//	if (Math.random() > 0.5) { // testing error handling
		serverBus.next([['widget-data', id], fetch(settings, samples)]);
//	} else {
//		serverBus.onNext([['widget-data', id], Rx.Observable.throw(new Error('Injected error'))]);
//	}
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
		'km', _.assoc(state.km, ['id'], null));

// This adds or overwrites a 'sample' column in the state.
// Called from setCohort, the column data will be fetched after
// the sample list returns from the server.
function addSampleColumn(state, width) {
	if (state.cohort.length === 0) {
		return state;
	}
	var field = signatureField('samples', {
			columnLabel: 'Sample ID',
			valueType: 'coded',
			signature: ['samples']
		}),
		newOrder = _.has(state.columns, 'samples') ? state.columnOrder : [...state.columnOrder, 'samples'],
		colSpec = getColSpec([field], {}),
		settings = _.assoc(colSpec,
				'width', width == null ? 136 : width,
				'user', _.pick(colSpec, ['columnLabel', 'fieldLabel'])),
		newState = _.assocIn(state,
			['columns', 'samples'], settings,
			['columnOrder'], newOrder);
	return _.assocIn(newState, ['data', 'samples', 'status'], 'loading');
}

var setCohort = (state, cohorts, width) =>
		addSampleColumn(
			resetZoom(
				reJoinFields(
					state.datasets,
					closeEmptyColumns(
						setCohortRelatedFields(
							remapFieldsForCohorts(state, cohorts),
							cohorts)))), width);

var userServers = state => _.keys(state.servers).filter(h => state.servers[h].user);

module.exports = {
	fetchDatasets,
	fetchSamples,
	fetchColumnData,
	setCohort,
	resetZoom,
	reJoinFields,
	userServers,
	closeEmptyColumns
};
