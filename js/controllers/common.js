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
var defaultServers = require('../defaultServers');
var {publicServers} = defaultServers;
var gaEvents = require('../gaEvents');
// pick up signature fetch
require('../models/signatures');

import Worker from 'worker-loader!./cluster-worker';

const worker = new Worker();

// XXX error handling? What do we do with errors in the worker?
const workerObs = Rx.Observable.fromEvent(worker, 'message').share();
var msgId = 0;

// sendMessage wraps worker messages in ajax-like observables, by assigning
// unique ids to each request, and waiting for a single response with the
// same id. The worker must echo the id in the response.
const sendMessage = msg => {
        var id = msgId++;
        worker.postMessage({msg, id});
        return workerObs.filter(ev => ev.data.id === id).take(1).map(ev => ev.data.msg);
};

function fetchClustering(serverBus, state, id) {
	var data = _.getIn(state, ['data', id]);
	// maybe prune the data that we send?
	serverBus.next([['cluster-result', id], sendMessage(['cluster', data])]);
}

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

function logSampleSources(cohortResps) {
	var havingSamples = cohortResps.filter(([v]) => v.length > 0)
			.map(([,, server]) => server),
		types = new Set(havingSamples.map(s =>
					s === defaultServers.servers.localHub ? 'localhost' :
					// counting all ucsc-hosted hubs as public
					s.indexOf('.xenahubs.net') !== -1 ? 'public' :
					'private'));
	if (types.has('localhost')) {
		// user has samples on localhost hub
		gaEvents('hubs', 'localhost');
	}
	if (types.has('private')) {
		// user has samples on private hub that isn't localhost
		gaEvents('hubs', 'private');
	}
	if (types.size > 1 && (types.has('localhost') || types.has('private'))) {
		// user is joining samples across hubs, and not all of them
		// are xena public hubs.
		gaEvents('hubs', 'cohort join');
	}
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
	logSampleSources(resps);
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
		fetchSamples(serverBus, user, state.cohort, state.allowOverSamples);
	}
};

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

function survivalFields(cohortFeatures) {
	var vars = kmModel.pickSurvivalVars(cohortFeatures),
		fields = {};

	if (hasSurvFields(vars)) {
		fields[`patient`] = getColSpec([codedFieldSpec(vars.patient)]);

		_.values(kmModel.survivalOptions).forEach(function(option) {
			if (vars[option.ev] && vars[option.tte]) {
				fields[option.ev] = getColSpec([probeFieldSpec(vars[option.ev])]);
				fields[option.tte] = getColSpec([probeFieldSpec(vars[option.tte])]);
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
	let {wizard: {cohortFeatures},
			spreadsheet: {cohort, survival, cohortSamples}} = state,
		fields = survivalFields(cohortFeatures[cohort.name]),
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
	fetchColumnData,
	fetchClustering,
	fetchDatasets,
	fetchSamples,
	fetchSurvival,
	resetZoom,
	setCohort,
	userServers,
	datasetQuery
};
