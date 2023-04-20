var {find, findValue, get, getIn, Let, merge, has, object, pairs, values} = require('../underscore_ext').default;
var cohortMaps = cohortDatasets => ({cohort}) =>  {
	var datasets = get(cohortDatasets, cohort);
	var maps = [].concat(...values(datasets)).filter(d => has(d, 'map'))
		.map(ds => ds.map.map(m => [ds.dsID, merge(m, {cohort})])).flat();
	return maps;
};

export function maps(cohorts, cohortDatasets) {
	if (!cohorts.length || !cohortDatasets) {
		return [];
	}
	return cohorts.map(cohortMaps(cohortDatasets)).flat();
}

var cohortCellTypeCluster = cohortDatasets => ({cohort}) =>
	[cohort,
		[].concat(...values(get(cohortDatasets, cohort)))
			.filter(d => has(d, 'cluster') || has(d, 'cellType'))
			.map(ds => (ds.cluster || []).concat(ds.cellType || [])
				.map(m => ({
					dsID: ds.dsID,
					field: m.feature,
					label: m.assay
				}))).flat()];

export function cellTypeCluster(cohorts, cohortDatasets) {
	return object(cohorts.map(cohortCellTypeCluster(cohortDatasets)));
}

// XXX try to factor out the common bits in all these methods. Maybe
// make one larger method that returns maps, cell types, and prob, under
// three keys, vs. having a bunch of different selectors.
var cohortLabelTransfer = cohortDatasets => ({cohort}) =>
	[cohort,
		[].concat(...values(get(cohortDatasets, cohort)))
			.filter(d => has(d, 'labeltransfer'))
			.map(ds => ds.labeltransfer.map(m => ({
					dsID: ds.dsID,
					field: m.transferredLabel,
					label: m.assay
				}))).flat()];

export function labelTransfer(cohorts, cohortDatasets) {
	return object(cohorts.map(cohortLabelTransfer(cohortDatasets)));
}


// XXX deprecate this call?
export function defaultMap(cohort, cohortDatasets, {map, view}) {
	var all = maps(cohort, cohortDatasets),
		selected = map && find(all, m => m[0] === map[0]);
	return selected ? {map, view} : {map: all[0], view: undefined};
}

export var hasDataset = state => getIn(state, ['dataset', 0]);
export var datasetMeta = state =>
	Let((dsID = hasDataset(state)) =>
		// use dataset cohort, in the state.dataset[1]
		values(state.cohortDatasets)
		.map(server => values(server).flat()).flat().find(ds => ds.dsID === dsID));

export var datasetCohort = state => getIn(state, ['dataset', 1, 'cohort']);

var hasField = field => (state, cohort) =>
	findValue(pairs(getIn(state, ['donorFields', cohort])),
		([host, fields]) => findValue(fields,
			f => f.field === field && [host, f.name]));

export var hasDonor = hasField('_DONOR');
export var hasDatasource = hasField('_DATASOURCE');

export var hasGene = (state, cohort) =>
	get(
		findValue(getIn(state, ['defaultStudy', 'studyList']),
			study => find(study.cohortList, c => c.cohort === cohort)),
		'preferredDataset');
