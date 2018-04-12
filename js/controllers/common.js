'use strict';

// Helper methods needed by multiple controllers.

var Rx = require('../rx');
var xenaQuery = require('../xenaQuery');
var _ = require('../underscore_ext');
var {reifyErrors, collectResults} = require('./errors');
var fetch = require('../fieldFetch');
var kmModel = require('../models/km');
var {getColSpec} = require('../models/datasetJoins');
var {signatureField} = require('../models/fieldSpec');
var {publicServers} = require('../defaultServers');
// pick up signature fetch
require('../models/signatures');

var datasetResults = resps => collectResults(resps, servers =>
		_.object(_.flatmap(servers, s => _.map(s.datasets, d => [d.dsID, d]))));

function datasetQuery(servers, cohort) {
	return Rx.Observable.zipArray(
		_.map(servers, server => reifyErrors(
				xenaQuery.datasetList(server, [cohort.name]).map(datasets => ({server, datasets})),
				{host: server}))
	).flatMap(datasetResults);
}

function fetchDatasets(serverBus, servers, cohort) {
	serverBus.next(['datasets', datasetQuery(servers, cohort)]);
}

const MAX_SAMPLES = 50 * 1000;

var allSamples = _.curry((cohort, max, server) => xenaQuery.cohortSamples(server, cohort, max === Infinity ? null : max));

function unionOfGroup(gb) {
	return _.union(..._.map(gb, ([v]) => v));
}

// Performance of this is probably poor, esp. due to underscore's horrible
// n^2 set operations.
function cohortHasPrivateSamples(cohortResps) {
	var {'true': pub, 'false': priv} = _.groupBy(cohortResps, ([,, server]) => _.contains(publicServers, server)),
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
var cohortSamplesQuery =
	(servers, max, {name, sampleFilter}) =>
		_.map(servers, allSamples(name, max))
			.map((resp, j) => resp.map(samples => [filterSamples(sampleFilter, samples), samples.length >= max, servers[j]]));

var collateSamples = _.curry((cohorts, max, resps) => {
	var serverOver = _.any(resps, ([, over]) => over),
		cohortSamples = unionOfGroup(resps || []).slice(0, max),
		cohortOver = cohortSamples.length >= max,
		hasPrivateSamples = cohortHasPrivateSamples(resps);
	return {samples: cohortSamples, over: serverOver || cohortOver, hasPrivateSamples};
});

// reifyErrors should be pass the server name, but in this expression we don't have it.
function samplesQuery(servers, cohort, max) {
	return Rx.Observable.zipArray(cohortSamplesQuery(servers, max, cohort).map(reifyErrors))
		.flatMap(resps => collectResults(resps, collateSamples(cohort, max)));
}

function fetchSamples(serverBus, servers, cohort, allowOverSamples) {
	serverBus.next(['samples', samplesQuery(servers, cohort, allowOverSamples ? Infinity : MAX_SAMPLES)]);
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
	let count = _.getIn(state, ['cohortSamples', 'length'], 0);
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
	if (!_.get(state.cohort, ['name'])) {
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

function updateWizard(serverBus, state, newState, opts = {}) {
	fetchCohorts(serverBus, state, newState, opts);
	let user = userServers(newState);
	// If there's a bookmark on wizard mode step 2, will we fail
	// to load the dataset?
	if (newState.cohort && (opts.force || (newState.cohort.name !== _.get(state.cohort, 'name')))) {
		fetchDatasets(serverBus, user, newState.cohort);
	}
}

var clearWizardCohort = state =>
	_.assocIn(state, ['wizard', 'datasets'], undefined,
					 ['wizard', 'features'], undefined);

//
// survival fields
//

var hasSurvFields  = vars => !!(_.some(_.values(kmModel.survivalOptions),
	option => vars[option.ev] && vars[option.tte] && vars[option.patient]));

var probeFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'float',
	fieldType: 'probes',
	fields: [name]
});

var codedFieldSpec = ({dsID, name}) => ({
	dsID,
	fetchType: 'xena', // maybe take from dataset meta instead of hard-coded
	valueType: 'coded',
	fieldType: 'clinical',
	fields: [name]
});

function mapToObj(keys, fn) {
	return _.object(keys, _.map(keys, fn));
}

function survivalFields(cohort, datasets, features) {
	var vars = kmModel.pickSurvivalVars(features),
		fields = {};

	if (hasSurvFields(vars)) {
		fields[`patient`] = getColSpec([codedFieldSpec(vars.patient)], datasets);

		_.values(kmModel.survivalOptions).forEach(function(option) {
			if (vars[option.ev] && vars[option.tte]) {
				fields[option.ev] = getColSpec([probeFieldSpec(vars[option.ev])], datasets);
				fields[option.tte] = getColSpec([probeFieldSpec(vars[option.tte])], datasets);
			}
		});

		if (_.has(fields, 'ev') && _.keys(fields).length > 3) {
			delete fields.ev;
			delete fields.tte;
		}
	}
	return fields;
}

// If field set has changed, re-fetch.
function fetchSurvival(serverBus, state) {
	let {wizard: {datasets, features},
			spreadsheet: {cohort, survival, cohortSamples}} = state,
		fields = survivalFields(cohort, datasets, features),
		survFields = _.keys(fields),
		refetch = _.some(survFields,
				f => !_.isEqual(fields[f], _.getIn(survival, [f, 'field']))),
		queries = _.map(survFields, key => fetch(fields[key], cohortSamples)),
		collate = data => mapToObj(survFields,
				(k, i) => ({field: fields[k], data: data[i]}));

	refetch && serverBus.next([
			'km-survival-data', Rx.Observable.zipArray(...queries).map(collate)]);
}


module.exports = {
	fetchCohortData,
	fetchCohorts,
	fetchColumnData,
	fetchDatasets,
	fetchSamples,
	fetchSurvival,
	resetZoom,
	setCohort,
	userServers,
	updateWizard,
	clearWizardCohort,
	datasetQuery
};
