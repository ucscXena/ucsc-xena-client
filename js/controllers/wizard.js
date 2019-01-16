'use strict';

import {Let, flatmap, fmap, getIn, groupBy, identity, map, matchKeys, pick, updateIn} from '../underscore_ext';
import {allCohorts, datasetList, allFieldMetadata} from '../xenaQuery';
var {servers: {localHub}} = require('../defaultServers');
import {ignoredType} from '../models/dataType';
import xenaQuery from '../xenaQuery';
import Rx from '../rx';
var {userServers} = require('./common');
import {make, compose} from './utils';
import query from './query';

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

var phenoPat = /^phenotype/i;  // match ../viwes/VariableSelect.js definition of phenotype data
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
	state.page !== 'heatmap' ? [] :
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

var {controller: fetchController, invalidatePath} =
	query(fetchMethods, wizardData, cachePolicy, 'wizard');

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
};

export default compose(fetchController, make(controls));
