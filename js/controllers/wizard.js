'use strict';
// A third experiment in more declarative fetch. Copying this from
// hub.js. Should extract into a common component if it works well.
// The dataset fetch is pretty much identical, and could probably
// be shared with hub.js.

import {Let, assocIn, dissoc, find, flatmap, fmap, getIn, groupBy, identity, initial, isEqual, last, map, matchKeys, pick, updateIn} from '../underscore_ext';
import {allCohorts, datasetList, allFieldMetadata} from '../xenaQuery';
var {servers: {localHub}} = require('../defaultServers');
import {ignoredType} from '../models/dataType';
import xenaQuery from '../xenaQuery';
import Rx from '../rx';
var {userServers} = require('./common');
import {make, compose} from './utils';

var {of} = Rx.Observable;

// Cohort metadata looks like
// {[cohort]: [tag, tag, ...], [cohort]: [tag, tag, ...], ...}
// We want data like
// {[tag]: [cohort, cohort, ...], [tag]: [cohort, cohort, ...], ...}
function invertCohortMeta(meta) {
	return fmap(
			groupBy(flatmap(meta, (tags, cohort) => tags.map(tag => [cohort, tag])),
				([, tag]) => tag),
			cohortTags => cohortTags.map(([cohort]) => cohort));
}

var fetchCohortMeta = () =>
	xenaQuery.fetchCohortMeta.map(invertCohortMeta).catch(() => of({}));

var fetchCohortPreferred  = () =>
	xenaQuery.fetchCohortPreferred.map(cohortPreferred =>
		fmap(cohortPreferred,
			preferred => fmap(preferred, ({host, dataset}) => JSON.stringify({host, name: dataset}))))
	.catch(() => {});

var fetchCohortPhenotype = () =>
	xenaQuery.fetchCohortPhenotype.map(cohortPhenotype =>
		 fmap(cohortPhenotype,
			preferred => map(preferred, ({host, dataset, feature}) =>
				   ({dsID: JSON.stringify({host, name: dataset}), name: feature}))));

var phenoPat = /^phenotypes?$/i;
var isPhenotype = ds => ds.type === 'clinicalMatrix' &&
		(!ds.dataSubType || ds.dataSubType.match(phenoPat));


// {wizard: {cohortDatasets: {[cohort]: {[server]: [dataset, ...]}}}}
var allPhenoDatasets = (state, cohort, servers) =>
	flatmap(
		pick(getIn(state, ['wizard', 'cohortDatasets', state.spreadsheet.cohort.name], {}),
			servers),
		(datasets, server) => datasets.filter(isPhenotype)
			.map(ds => ['cohortFeatures', cohort, server, ds.name]));

// Do we really have to handle linkedHub here?? Shouldn't it be set in state?
// Depends on order of our reducers? We shouldn't have to deal with it here.
var wizardData = state =>
	Let(({spreadsheet} = state, servers = userServers(spreadsheet)) => [
		['cohortMeta'],
		['cohortPreferred'],
		['cohortPhenotype'],
		...servers.map(server => ['serverCohorts', server]),
		...(spreadsheet.cohort ?
			servers.map(server => ['cohortDatasets', spreadsheet.cohort.name, server]) :
			[]),
		...(spreadsheet.cohort ? allPhenoDatasets(state, spreadsheet.cohort.name, servers) : [])
	]);

var fetchMethods = {
	// XXX Note that this will cache lists from hubs that the user has
	// recently disabled. We only clear cache when the cohort is changed.
	// OTOH it will fetch any recently enabled hubs. So, the view should
	// iterate over the userServer list, not this cache.
	cohortDatasets: (cohort, server) =>
		datasetList(server, [cohort]).catch(() => of([])),
	cohortFeatures: (cohort, server, dataset) => allFieldMetadata(server, dataset)
		.catch(() => of([])),
	serverCohorts: server => allCohorts(server, ignoredType)
		.catch(() => of([])),
	cohortMeta: () => fetchCohortMeta(),
	cohortPreferred: () => fetchCohortPreferred(),
	cohortPhenotype: () => fetchCohortPhenotype()
};

// To make this more general, would need to follow the path until
// we hit a dispatch method, then pass args.
// XXX should this inject a common 'error' value, if the query fails?
// We would need to update some views where we currently map to empty
// array on error.
var fetchData = ([type, ...args]) => fetchMethods[type](...args);

// XXX Local mutatable state. The effects controller is stateful wrt
// data queries.
var queue = [];
var outOfDate = {};

var wizardPostActions = (serverBus, state, newState) => {
	if (newState.page !== 'heatmap') {
		// Note this means we don't do any cache operations when we leave the page.
		return;
	}

	var toFetch = wizardData(newState)
		.filter(path => (getIn(newState.wizard, path) == null || getIn(outOfDate, path))
				&& !find(queue, p => isEqual(p, path)));

	toFetch.forEach(path => {
		queue.push(path);
		serverBus.next([['wizard-merge-data', path], fetchData(path)]);
	});
};

// XXX review this for wizard
var cachePolicy = {
	// cache all hosts
	// ['serverCohorts', server]
	serverCohorts: identity,
	cohortMeta: identity,
	cohortPreferred: identity,
	cohortPhenotype: identity,

	// cache a single key (cohort): the last cohort updated.
	// ['cohortDatasets', cohort, server]
	// ['cohortFeatures', cohort, server, dsName]
	default: (state, path) =>
		updateIn(state, ['wizard', path[0]], item => pick(item, path[1]))
};

var clearCache = fn => (state, path, data) =>
	(cachePolicy[path[0]] || cachePolicy.default)(fn(state, path, data), path);

var enforceValue = (path, val) => {
	if (val == null) {
		// Fetch methods must return a value besides null or undefined. Otherwise
		// this will create a request loop, where we fetch again because we can't
		// tell the data has already been fetched.
		console.error(`Received invalid response for path ${path}`);
		return {error: 'invalid value'};
	}
	return val;
};

function invalidatePath(state, pattern) {
	matchKeys(state, pattern).forEach(path => {
		outOfDate = assocIn(outOfDate, path, true);
	});
}

// mark as valid
function validatePath(path) {
	outOfDate = updateIn(outOfDate, initial(path), p => p && dissoc(p, last(path)));
}

var invalidateCohorts = Let(({any} = matchKeys) =>
	function ({wizard}) {
		invalidatePath(wizard, ['cohortMeta']);
		invalidatePath(wizard, ['cohortPreferred']);
		invalidatePath(wizard, ['cohortPhenotype']);
		invalidatePath(wizard, ['serverCohorts', any]);
		invalidatePath(wizard, ['cohortDatasets', any, any]);
		invalidatePath(wizard, ['cohortFeatures', any, any, any]);
	});

var invalidateLocalHub = Let(({any} = matchKeys) =>
	function (_, __, {wizard}) {
		invalidatePath(wizard, ['serverCohorts', localHub]);
		invalidatePath(wizard, ['cohortDatasets', any, localHub]);
		invalidatePath(wizard, ['cohortFeatures', any, localHub, any]);
	});

var controls = {
	'localStatus-post!': invalidateLocalHub,
	'localQueue-post!': invalidateLocalHub,
	'refresh-cohorts-post!': (serverBus, state, newState) =>
		invalidateCohorts(newState),
	'wizard-merge-data': clearCache((state, path, data) =>
		assocIn(state, ['wizard', ...path], enforceValue(path, data))),
	'wizard-merge-data-post!': (serverBus, state, newState, path) => {
		var i = queue.findIndex(p => isEqual(p, path));
		queue.splice(i, 1);
		validatePath(path);
	},
};

var fetchController = {
	action: identity,
	postAction: wizardPostActions
};

export default compose(fetchController, make(controls));
