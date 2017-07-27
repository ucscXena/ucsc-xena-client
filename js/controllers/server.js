'use strict';

var _ = require('../underscore_ext');
var Rx = require('../rx');
var {reifyErrors, collectResults} = require('./errors');
var {closeEmptyColumns, reJoinFields, resetZoom, setCohort, fetchDatasets,
	userServers, fetchSamples, fetchColumnData} = require('./common');

var xenaQuery = require('../xenaQuery');
var {allFieldMetadata} = xenaQuery;
var {updateFields, xenaFieldPaths, updateStrand, filterByDsID} = require('../models/fieldSpec');
var identity = x => x;
var {parseBookmark} = require('../bookmark');

function featuresQuery(datasets) {
	var clinicalMatrices = _.filter(datasets, ds => ds.type === 'clinicalMatrix'),
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

var resetCohort = state => {
	let activeCohorts = _.filter(state.cohort, c => _.contains(state.cohorts, c.name));
	return _.isEqual(activeCohorts, state.cohort) ? state :
		setCohort(state, activeCohorts);
};

var filterColumnDs = _.curry(
	(datasets, column) => _.updateIn(column, ['fieldSpecs'], filterByDsID(datasets)));


// we must re-fetch widget data after this operation, since the column
// definitions are changing.
var dropUnknownFields = state =>
	_.assoc(state, 'columns', _.mapObject(state.columns, filterColumnDs(state.datasets)));

var resetColumnFields = state =>
	reJoinFields(
		state.datasets,
		closeEmptyColumns(
			dropUnknownFields(state)));

var resetLoadPending = state => _.dissoc(state, 'loadPending');

// Fetches the gene strand info for a geneProbes field.
// We need the gene from one non-null field. This is
// probably broken in some way for composite views.
function fetchStrand(serverBus, state, id, gene, dsID) {
	var {probemap} = _.getIn(state, ['datasets', dsID]),
		{host} = JSON.parse(dsID);
	serverBus.next(['strand', xenaQuery.probemapGeneStrand(host, probemap, gene).catch(err => {console.log(err); return Rx.Observable.of('+');}), id]);
}

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

var controls = {
	// XXX reset loadPending flag
	bookmark: (state, bookmark) => resetLoadPending(parseBookmark(bookmark)),
	inlineState: (state, newState) => resetLoadPending(newState),
	cohorts: (state, cohorts) => resetCohort(_.assoc(state, "cohorts", cohorts)),
	'cohorts-post!': (serverBus, state, newState) => {
		let {cohort} = newState,
			user = userServers(newState);
		fetchSamples(serverBus, user, cohort, newState.allowOverSamples);
		fetchDatasets(serverBus, user, cohort);
	},
	datasets: (state, datasets) => {
		var newState = resetColumnFields(_.assoc(state, "datasets", datasets)),
			{cohortSamples, columnOrder} = newState;
		if (cohortSamples) {
			return _.reduce(
					columnOrder,
					(acc, id) => _.assocIn(acc, ['data', id, 'status'], 'loading'),
					newState);
		}
		return newState;
	},
	'datasets-post!': (serverBus, state, newState, datasets) => {
		var {cohortSamples, columns} = newState;
		if (cohortSamples) {
			_.mapObject(columns, (settings, id) =>
					fetchColumnData(serverBus, cohortSamples, id, settings));
		}
		fetchFeatures(serverBus, datasets);
	},
	features: (state, features) => _.assoc(state, "features", features),
	samples: (state, {samples, over}) => {
		var newState = resetZoom(_.assoc(state,
					'cohortSamples', samples,
					'samplesOver', over,
					'samples', _.range(_.sum(_.map(samples, c => c.length))))),
			{columnOrder} = newState;
		return _.reduce(
				columnOrder,
				(acc, id) => _.assocIn(acc, ['data', id, 'status'], 'loading'),
				newState);
	},
	'samples-post!': (serverBus, state, newState, {samples}) =>
		_.mapObject(_.get(newState, 'columns', {}), (settings, id) =>
				fetchColumnData(serverBus, samples, id, settings)),
	'normalize-fields': (state, fields, id, settings, xenaFields) =>
		_.assocIn(state, ['columns', id], updateFields(settings, xenaFields, fields)),
	'normalize-fields-post!': (serverBus, state, newState, fields, id, settings, xenaFields) => {
		// For geneProbes, fetch the gene model (just strand right now), and defer the
		// data fetch.
		if (settings.fieldType === 'geneProbes') {
			// Pick first xena field, and 1st gene name.
			fetchStrand(serverBus, state, id, fields[0][0], _.getIn(settings, xenaFields[0]).dsID);
		} else {
			fetchColumnData(serverBus, state.cohortSamples, id, _.getIn(newState, ['columns', id]));
		}
	},
	'strand': (state, strand, id) => {
		// Update composite & all xena fields with strand info.
		var settings = _.assoc(_.getIn(state, ['columns', id]), 'strand', strand);
		return _.assocIn(state, ['columns', id], updateStrand(settings, xenaFieldPaths(settings), strand));
	},
	'strand-post!': (serverBus, state, newState, strand, id) => {
		// Fetch geneProbe data after we have the gene info.
		fetchColumnData(serverBus, state.cohortSamples, id, _.getIn(newState, ['columns', id]));
	},
	// XXX Here we drop the update if the column is no longer open.
	'widget-data': (state, id, data) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id], _.assoc(data, 'status', 'loaded'))
			: state,
	'widget-data-error': (state, id) =>
		columnOpen(state, id) ?
			_.assocIn(state, ["data", id, 'status'], 'error') : state,
	'columnEdit-features': (state, list) => _.assocIn(state, ["columnEdit", 'features'], list),
	'columnEdit-examples': (state, list) => _.assocIn(state, ["columnEdit", 'examples'], list),
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival),
	// XXX Here we should be updating application state. Instead we invoke a callback, because
	// chart.js can't handle passed-in state updates.
	'chart-average-data-post!': (serverBus, state, newState, offsets, thunk) => thunk(offsets),
	cohortMeta: (state, meta) => _.assoc(state, 'cohortMeta', invertCohortMeta(meta)),
	cohortPreferred: (state, cohortPreferred) => _.assoc(state, 'cohortPreferred',
			_.fmap(cohortPreferred,
				preferred => _.fmap(preferred, ({host, dataset}) => JSON.stringify({host, name: dataset}))))
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
