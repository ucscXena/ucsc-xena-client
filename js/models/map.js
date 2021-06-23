var _ = require('../underscore_ext').default;
export function maps(cohort, cohortDatasets) {
	if (!cohort || !cohortDatasets) {
		return [];
	}
	var datasets = _.get(cohortDatasets, cohort.name);
	var maps = [].concat(..._.values(datasets)).filter(d => _.has(d, 'map'))
		.map(ds => ds.map.map(m => [ds.dsID, m])).flat();
	return maps;
}

export function defaultMap(cohort, cohortDatasets, {map, view}) {
	var all = maps(cohort, cohortDatasets),
		selected = map && _.find(all, m => m[0] === map[0]);
	return selected ? {map, view} : {map: all[0], view: undefined};
}
