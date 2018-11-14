'use strict';

var {getIn} = require('../underscore_ext');
var recommend = require('../stats/recommend');

var getMatches = list => {
	var probes = recommend.probemap(list),
		samples = recommend.cohort(list);
	return {
		probes,
		topProbe: getIn(probes, [0, 'score'], 0),
		samples,
		topSample: getIn(samples, [0, 'score'], 0)
	};
};

// If we match probes, we can predict GENOMIC_MATRIX. If we match samples, we
// can't predict CLINICAL_MATRIX unless we rule-out segmented and copy number.
// For now, we should only be infering samples on row, or samples on column.
function infer(firstRow, firstColumn) {
    const row = getMatches(firstRow),
		column = getMatches(firstColumn),
		rowSamples = {
			samples: 'row',
			probemaps: column.probes,
			cohorts: row.samples },
		columnSamples = {
			samples: 'column',
			probemaps: row.probes,
			cohorts: column.samples },
		// try to assign cohort first. If we can't, then try to get orientation from
		// probes.
		result = row.topSample > column.topSample ? rowSamples :
			column.topSample > row.topSample ? columnSamples :
			row.topProbe > column.topProbe ? columnSamples :
			column.topProbe > row.topProbe ? rowSamples :
			{};

	return result;
}

export default infer;
