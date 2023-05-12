var {Let, flatmap, fmap, getIn, groupBy, identity, map, matchKeys, pick, updateIn} = require('../underscore_ext').default;
var xenaQuery = require('../xenaQuery');
var {servers: {localHub}} = require('../defaultServers');
import {ignoredType, isPhenotype} from '../models/dataType';
var Rx = require('../rx').default;
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

var fetchCohortAnalytic = () =>
	xenaQuery.fetchCohortAnalytic;

var fetchTumorMap = () =>
	xenaQuery.fetchTumorMap.map(res => res).catch(() => {});

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
		['cohortAnalytic'],
		['cohortTumorMap'],
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
		xenaQuery.datasetList(server, [cohort]).catch(() => of([])),
	cohortFeatures: (cohort, server, dataset) => xenaQuery.allFieldMetadata(server, dataset)
		.catch(() => of([])),
	serverCohorts: server => xenaQuery.allCohorts(server, ignoredType)
		.catch(() => of([])),
	cohortMeta: () => fetchCohortMeta(),
	cohortPreferred: () => fetchCohortPreferred(),
	cohortPhenotype: () => fetchCohortPhenotype(),
	cohortAnalytic: () => fetchCohortAnalytic(),
	cohortTumorMap: () => fetchTumorMap()
};

// XXX review this for wizard
var cachePolicy = {
	// cache all hosts
	// ['serverCohorts', server]
	serverCohorts: identity,
	cohortMeta: identity,
	cohortPreferred: identity,
	cohortPhenotype: identity,
	cohortAnalytic: identity,
	cohortTumorMap: identity,

	// cache a single key (cohort): the last cohort updated.
	// ['cohortDatasets', cohort, server]
	// ['cohortFeatures', cohort, server, dsName]
	default: (state, path) =>
		updateIn(state, ['wizard', path[0]], item => pick(item, path[1]))
};

var {controller: fetchController, invalidatePath} =
	query(fetchMethods, wizardData, cachePolicy, 'wizard');

var invalidateCohorts = Let(({any} = matchKeys) =>
	function (serverBus) {
		invalidatePath(serverBus, ['cohortMeta']);
		invalidatePath(serverBus, ['cohortPreferred']);
		invalidatePath(serverBus, ['cohortPhenotype']);
		invalidatePath(serverBus, ['cohortAnalytic']);
		invalidatePath(serverBus, ['serverCohorts', any]);
		invalidatePath(serverBus, ['cohortDatasets', any, any]);
		invalidatePath(serverBus, ['cohortFeatures', any, any, any]);
	});

var invalidateLocalHub = Let(({any} = matchKeys) =>
	function (serverBus) {
		invalidatePath(serverBus, ['serverCohorts', localHub]);
		invalidatePath(serverBus, ['cohortDatasets', any, localHub]);
		invalidatePath(serverBus, ['cohortFeatures', any, localHub, any]);
	});

var controls = {
	'localStatus-post!': invalidateLocalHub,
	'localQueue-post!': invalidateLocalHub,
	'refresh-cohorts-post!': invalidateCohorts
};

export default compose(fetchController, make(controls));
