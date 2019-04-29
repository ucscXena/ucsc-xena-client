'use strict';

var _ = require('../underscore_ext');
import {computeSettings, matchFields} from '../models/columns';
var {resetZoom, fetchColumnData, fetchCohortData, setCohort, fetchClustering} = require('./common');
var {compose, make, mount} = require('./utils');
import * as Rx from '../rx';
var uuid = require('../uuid');

var columnOpen = (state, id) => _.has(_.get(state, 'columns'), id);

var resetLoadPending = state => _.dissoc(state, 'loadPending');

var setSamples = (state, {samples, over, hasPrivateSamples}) =>
	_.assoc(state,
			'cohortSamples', samples,
			'samplesOver', over,
			'hasPrivateSamples', hasPrivateSamples);

var setLoading = state =>
	_.reduce(state.columnOrder,
			(acc, id) => _.assocIn(acc, ['data', id, 'status'], 'loading'),
			state);

// XXX put this in a central location, ideally behind a memoizer,
// and accessible from the reducers. Would be best to ditch dsID.
var datasetsByID = state => {
	var cohort = _.get(state.spreadsheet.cohort, 'name'),
		cohortDatasets = _.get(state.wizard.cohortDatasets, cohort, {}),
		allDS = _.flatmap(cohortDatasets, _.identity);
	return _.object(_.pluck(allDS, 'dsID'), allDS);
};

// XXX put this in a central location, ideally behind a memoizer,
// and accessible from the reducers. Would be best to ditch dsID.
var featuresByID = state => {
	var cohort = _.get(state.spreadsheet.cohort, 'name'),
		features = _.get(state.wizard.cohortFeatures, cohort, {}),
		all = _.flatmap(features, (datasets, host) =>
				_.map(datasets, (fields, name) => [JSON.stringify({host, name}), fields]));
	return _.object(all);
};

var linkedColumns = (state, [fieldResp, ids]) => {
	var columnParams = state.params.columns,
		byID = datasetsByID(state),
		features = featuresByID(state),
		columns = _.mmap(columnParams, fieldResp,
			(column, {matches}) =>
				_.Let((dsID = JSON.stringify({host: column.host, name: column.name})) =>
				computeSettings(byID, features, column.fields, column.opts, dsID, matches[0]))); // XXX 0?

	return _.reduce(columns,
			 (acc, spec, i) => _.assocIn(acc, ['spreadsheet', 'columns', ids[i]], spec),
			 _.updateIn(resetLoadPending(state),
					['spreadsheet'], s => _.dissoc(s, 'fieldMatches'),
					['spreadsheet', 'columnOrder'], o => o.concat(ids),
					['spreadsheet', 'wizardMode'], () => false));
};

// true if we have a dataset list for every linked host, or every
// server in state.
var datasetsLoaded = state => {
	var cohortDatasets = _.get(state.wizard.cohortDatasets,
		_.get(state.spreadsheet.cohort, 'name'), {}),
		servers = state.spreadsheet.servers,
		dsServers = _.pluck(state.params.columns, 'host');
	return dsServers.every(s => cohortDatasets[s]) ||
		Object.keys(servers).every(s => cohortDatasets[s]);
};

// true if we have all the features loaded. Assumes that all
// dataset meta is loaded.
var featuresLoaded = state => {
	var cohort = _.get(state.spreadsheet.cohort, 'name'),
		byID = datasetsByID(state),
		required = _.flatmap(state.params.columns, column => {
			var ds = byID[JSON.stringify({host: column.host, name: column.name})];
			return ds && ds.type === 'clinicalMatrix' ? [column] : [];
		}),
		loaded = _.get(state.wizard.cohortFeatures, cohort, {});

	return _.every(required, d =>
		_.has(loaded, d.host) && _.has(loaded[d.host], d.name));
};

// if loadPending & we have columns, only load when
// when we have datasets & features
var shouldLoadColumns = state =>
	state.loadPending && _.getIn(state, ['params', 'columns']) &&
	datasetsLoaded(state) && featuresLoaded(state);

var controls = {
	// XXX was clearWizardCohort just cleaning up bad bookmarks? Do we need to handle that case?
	// How do we handle cohortSamples reloading generally, and with respect to restoring state?
	bookmark: (state, bookmark) => resetLoadPending(_.merge(state, bookmark)),
	'bookmark-error': state => resetLoadPending(_.assoc(state, 'stateError', 'bookmark')),
	// Here we need to load cohort data if servers or cohort has changed,
	// *or* if we never loaded cohort data (e.g. due to waiting on bookmark).
	'manifest': (state, {cohort, samples}) =>
		_.updateIn(state, ['spreadsheet'], setCohort({name: cohort, sampleFilter: samples}, null)),
	'manifest-post!': (serverBus, state, newState) =>
		// just samples now
		fetchCohortData(serverBus, newState.spreadsheet),
	inlineState: (state, newState) => resetLoadPending(newState),
	samples: (state, resp) => {
		var fieldMatches = _.getIn(state, ['spreadsheet', 'fieldMatches']),
			maySetLoading = !state.loadPending || fieldMatches ? setLoading : _.identity,
			maySetColumns = state.loadPending && fieldMatches ? linkedColumns : _.identity;
		return _.updateIn(maySetColumns(state, fieldMatches),
			['spreadsheet'], state => maySetLoading(resetZoom(setSamples(state, resp))));
	},
	'samples-post!': (serverBus, state, newState, {samples}) => {
		var fieldMatches = _.getIn(state, ['spreadsheet', 'fieldMatches']);
		if (!state.loadPending || fieldMatches) {
			_.mapObject(_.get(newState.spreadsheet, 'columns', {}), (settings, id) =>
					fetchColumnData(serverBus, samples, id, settings));
		}
	},
	'wizard-merge-data-post!': (serverBus, state, newState) => {
		if (shouldLoadColumns(newState)) {
			// This is just unbelievable. Should be much simpler.
			var byId = datasetsByID(newState),
				columns = newState.params.columns;
			serverBus.next(['columns-match-fields',
				Rx.Observable.zip(...columns.map(
					// XXX handle non-matching dataset name
					c =>  _.Let((dsID = JSON.stringify({host: c.host, name: c.name})) =>
						matchFields(byId, byId[dsID].type === 'clinicalMatrix' ? 'Phenotypic' : 'Genomic', [dsID], c.fields)))),
				// Note that uuid is a side-effect, and can't be run in a reducer.
				_.times(columns.length, uuid)]);
		}
	},
	'columns-match-fields': (state, resp, ids) =>
		!_.isEmpty(_.getIn(state, ['spreadsheet', 'cohortSamples'])) ?
			_.updateIn(linkedColumns(state, [resp, ids]), ['spreadsheet'], setLoading) :
			_.assocIn(state, ['spreadsheet', 'fieldMatches'], [resp, ids]),
	'columns-match-fields-post!': (serverBus, state, newState) => {
		if (!_.isEmpty(_.getIn(state, ['spreadsheet', 'cohortSamples']))) {
			_.mapObject(_.get(newState.spreadsheet, 'columns', {}), (settings, id) =>
					fetchColumnData(serverBus, newState.spreadsheet.cohortSamples, id, settings));
		}
	}
};

var spreadsheetControls = {
	'dataset-cohort': (state, resp)  => {
		var cohort = _.getIn(resp, [0, 'cohort']);
		return cohort ? setCohort({name: cohort}, undefined, state) : state;
	},
	'dataset-cohort-post!': (serverBus, state, newState, resp) => {
		var cohort = _.getIn(resp, [0, 'cohort']);
		if (cohort) {
			fetchCohortData(serverBus, newState);
		} // XXX set error if no cohort, e.g. if dataset is unknown
	},
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
	'km-survival-data': (state, survival) => _.assoc(state, 'survival', survival),
	// XXX Here we should be updating application state. Instead we invoke a callback, because
	// chart.js can't handle passed-in state updates.
	'chart-average-data-post!': (serverBus, state, newState, offsets, thunk) => thunk(offsets)
};

module.exports = compose(
		make(controls),
		mount(make(spreadsheetControls), ['spreadsheet']));
