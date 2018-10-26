'use strict';

var _ = require('../underscore_ext');
var Rx = require('../rx');
var {reifyErrors, collectResults} = require('./errors');
var {resetZoom, fetchColumnData, fetchCohortData, setCohort, fetchClustering,
	fetchColumnData, updateWizard, clearWizardCohort} = require('./common');

var xenaQuery = require('../xenaQuery');
var {allFieldMetadata} = xenaQuery;
var {compose, make, mount} = require('./utils');
var phenoPat = /^phenotypes?$/i;
function featuresQuery(datasets) {
	var clinicalMatrices = _.filter(datasets,
			ds => ds.type === 'clinicalMatrix' && (!ds.dataSubType || ds.dataSubType.match(phenoPat))),
		dsIDs = _.pluck(clinicalMatrices, 'dsID');

	// XXX note that datasetFeatures takes optional args, so don't pass it directly
	// to map.
	return Rx.Observable.zipArray(
				_.map(dsIDs, dsID => reifyErrors(allFieldMetadata(dsID), {dsID}))
			).flatMap(resps =>
				collectResults(resps, features => _.object(dsIDs, features)));
}

function fetchFeatures(serverBus, datasets) {
	serverBus.next(['features', featuresQuery(datasets)]);
}

var columnOpen = (state, id) => _.has(_.get(state, 'columns'), id);

var resetLoadPending = state => _.dissoc(state, 'loadPending');

// Cohort metadata looks like
// {[cohort]: [tag, tag, ...], [cohort]: [tag, tag, ...], ...}
// We want data like
// {[tag]: [cohort, cohort, ...], [tag]: [cohort, cohort, ...], ...}
function invertCohortMeta(meta) {
	return _.fmap(
			_.groupBy(_.flatmap(meta, (tags, cohort) => tags.map(tag => [cohort, tag])),
				([, tag]) => tag),
			cohortTags => cohortTags.map(([cohort]) => cohort));
}

var wizardControls = {
	cohorts: (state, cohorts) => _.assoc(state, "cohorts", cohorts),
	datasets: (state, datasets) => _.assoc(state, 'datasets', datasets),
	'datasets-post!': (serverBus, state, newState, datasets) =>
		fetchFeatures(serverBus, datasets),
	features: (state, features) => _.assoc(state, 'features', features),
	cohortMeta: (state, meta) => _.assoc(state, 'cohortMeta', invertCohortMeta(meta)),
	cohortPreferred: (state, cohortPreferred) => _.assoc(state, 'cohortPreferred',
			_.fmap(cohortPreferred,
				preferred => _.fmap(preferred, ({host, dataset}) => JSON.stringify({host, name: dataset})))),
	cohortPhenotype: (state, cohortPhenotype) => _.assoc(state, 'cohortPhenotype',
			_.fmap(cohortPhenotype,
				preferred => _.map(preferred, ({host, dataset, feature}) => ({dsID: JSON.stringify({host, name: dataset}), name: feature}))))
};

var bookmarkPost = (serverBus, state, newState) => {
	updateWizard(serverBus, state.spreadsheet, newState.spreadsheet,
			{force: !_.getIn(newState, ['wizard', 'cohorts'])});
};

var controls = {
	bookmark: (state, bookmark) => clearWizardCohort(resetLoadPending(_.merge(state, bookmark))),
	'bookmark-error': state => resetLoadPending(_.assoc(state, 'stateError', 'bookmark')),
	// Here we need to load cohort data if servers or cohort has changed,
	// *or* if we never loaded cohort data (e.g. due to waiting on bookmark).
	'bookmark-post!': bookmarkPost,
	'bookmark-error-post!': bookmarkPost,
	'manifest': (state, {cohort, samples}) =>
		clearWizardCohort(
				_.updateIn(state, ['spreadsheet'], setCohort({name: cohort, sampleFilter: samples}, null))),
	'manifest-post!': (serverBus, state, newState) =>
		fetchCohortData(serverBus, newState.spreadsheet),
	inlineState: (state, newState) => resetLoadPending(newState),
	'inlineState-post!': (serverBus, state, newState) => {
		updateWizard(serverBus, state.spreadsheet, newState.spreadsheet,
				{force: !_.getIn(newState, ['wizard', 'cohorts'])});
	}
};

var spreadsheetControls = {
	samples: (state, {samples, over, hasPrivateSamples}) => {
		var newState = resetZoom(_.assoc(state,
					'cohortSamples', samples,
					'samplesOver', over,
					'hasPrivateSamples', hasPrivateSamples)),
			{columnOrder} = newState;
		return _.reduce(
				columnOrder,
				(acc, id) => _.assocIn(acc, ['data', id, 'status'], 'loading'),
				newState);
	},
	'samples-post!': (serverBus, state, newState, {samples}) =>
		_.mapObject(_.get(newState, 'columns', {}), (settings, id) =>
				fetchColumnData(serverBus, samples, id, settings)),
	// XXX Here we drop the update if the column is no longer open.
	'widget-data': (state, id, data) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id], _.assoc(data, 'status', 'loaded'))
			: state,
	'widget-data-post!': (serverBus, state, newState, id) => {
		if (_.getIn(newState, ['columns', id, 'clustering']) != null) {
			fetchClustering(serverBus, newState, id);
		}
	},
	'cluster-result': (state, id, order) =>
		_.assocIn(state, ['data', id, 'clustering', 'probes'], order),
	'widget-data-error': (state, id) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id, 'status'], 'error') : state,
	'columnEdit-features': (state, list) => _.assocIn(state, ["columnEdit", 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, ["columnEdit", 'examples'], list),
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival),
	// XXX Here we should be updating application state. Instead we invoke a callback, because
	// chart.js can't handle passed-in state updates.
	'chart-average-data-post!': (serverBus, state, newState, offsets, thunk) => thunk(offsets)
};

module.exports = compose(
		make(controls),
		mount(make(wizardControls), ['wizard']),
		mount(make(spreadsheetControls), ['spreadsheet']));
