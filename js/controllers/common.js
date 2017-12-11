'use strict';

// Helper methods needed by multiple controllers.

var Rx = require('../rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');
var fetch = require('../fieldFetch');
var {getColSpec} = require('../models/datasetJoins');
var {signatureField} = require('../models/fieldSpec');
var {publicServers} = require('../defaultServers');
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

var allSamples = _.curry((cohort, max, server) => xenaQuery.cohortSamples(server, cohort, max === Infinity ? null : max));

function unionOfGroup(gb) {
	return _.union(..._.map(gb, ([, v]) => v));
}

// Performance of this is probably poor, esp. due to underscore's horrible
// n^2 set operations.
function cohortHasPrivateSamples(cohortResps) {
	var {'true': pub, 'false': priv} = _.groupBy(cohortResps, ([,,, server]) => _.contains(publicServers, server)),
		pubSamps = unionOfGroup(pub),
		privSamps = unionOfGroup(priv);
	return _.difference(privSamps, pubSamps).length > 0;
}

function filterSamples(sampleFilter, samples) {
	return sampleFilter ? _.intersection(sampleFilter, samples) : samples;
}

// For the cohort, query all servers,
// return a stream per-cohort, each of which returns an event
// [cohort, [sample, ...]].
// By not combining them here, we can uniformly handle errors, below.
var cohortSamplesQuery = _.curry(
	(servers, max, {name, sampleFilter}, i) =>
		_.map(servers, allSamples(name, max))
			.map((resp, j) => resp.map(samples => [i, filterSamples(sampleFilter, samples), samples.length >= max, servers[j]])));

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
		cohortOver = _.any(cohortSamples, samples => samples.length >= max),
		hasPrivateSamples = _.any(byCohort, cohortHasPrivateSamples);
	return {samples: cohortSamples, over: serverOver || cohortOver, hasPrivateSamples};
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
	let count = _.getIn(state, ['cohortSamples', 0, 'length'], 0);
	return _.updateIn(state, ["zoom"],
					 z => _.merge(z, {count: count, index: 0}));
}

var setCohortRelatedFields = (state, cohort) =>
	_.assoc(state,
		'cohort', cohort,
		'hasPrivateSamples', false,
		'cohortSamples', [],
		'columns', {},
		'columnOrder', [],
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
				'width', Math.round(width == null ? 136 : width),
				'user', _.pick(colSpec, ['columnLabel', 'fieldLabel'])),
		newState = _.assocIn(state,
			['columns', 'samples'], settings,
			['columnOrder'], newOrder);
	return _.assocIn(newState, ['data', 'samples', 'status'], 'loading');
}

var setWizardAndMode = state =>
	_.assocIn(state,
			['wizardMode'], true,
			['mode'], 'heatmap');

var setCohort = _.curry((cohort, width, state) =>
		addSampleColumn(
			setWizardAndMode(
				resetZoom(
					setCohortRelatedFields(state, cohort))),
			width));

var userServers = state => _.keys(state.servers).filter(h => state.servers[h].user);

var fetchCohortData = (serverBus, state) => {
	let user = userServers(state);
	if (state.cohort) {
		fetchDatasets(serverBus, user, state.cohort);
		fetchSamples(serverBus, user, state.cohort, state.allowOverSamples);
	}
};

var unionOfResults = resps => collectResults(resps, results => _.union(...results));

function cohortQuery(servers) {
	return Rx.Observable.zipArray(_.map(servers, s => reifyErrors(xenaQuery.allCohorts(s), {host: s})))
			.flatMap(unionOfResults);
}

function fetchCohorts(serverBus, state, newState, {force} = {}) {
	var user = userServers(state),
		newUser = userServers(newState);
	if (force || !_.listSetsEqual(user, newUser)) {
		serverBus.next(['cohorts', cohortQuery(newUser)]);
	}
}

function updateWizard(serverBus, state, newState, opts) {
	fetchCohorts(serverBus, state, newState, opts);
	let user = userServers(state);
	// If there's a bookmark on wizard mode step 2, will we fail
	// to load the dataset?
	if (newState.cohort && newState.cohort !== state.cohort) {
		fetchDatasets(serverBus, user, newState.cohort);
	}
}

var clearWizardCohort = state =>
	_.assocIn(state, ['wizard', 'datasets'], undefined,
					 ['wizard', 'features'], undefined);

module.exports = {
	fetchCohortData,
	fetchCohorts,
	fetchColumnData,
	fetchDatasets,
	fetchSamples,
	resetZoom,
	setCohort,
	userServers,
	updateWizard,
	clearWizardCohort,
	datasetQuery
};
