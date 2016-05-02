/*global require: false, module: false */
'use strict';
var _ = require('../underscore_ext');

// We have operations on fieldSpecs, and operations on fieldData.

var saveNull = fn => v => v == null ? v : fn(v);

// XXX This is repeated in km.js
function floatThirds(floatVals) {
	let sorted = _.without(floatVals, null, undefined).sort((a, b) => a - b),
		low = sorted[Math.round(sorted.length / 3)],
		high = sorted[Math.round(2 * sorted.length / 3)];

	return _.map(floatVals, saveNull(v => v < low ? 0 :
						(v < high ? 1 : 2)));
}

// Convert float data to coded data, by splitting into ranges.
function floatToCoded(data) {
	var values = floatThirds(_.getIn(data, ['req', 'values', 0]));
	return _.assocIn(data,
			['req', 'values'], [values],
			['codes'], ['low', 'middle', 'high']);
}

// Rewrite coded data to new codes, via 'mapping',
// dict of string -> int.
var remapCodes = _.curry((mapping, data) => {
	var codes = _.get(data, 'codes');
	return _.updateIn(data,
			['req', 'values', 0],
			vals => vals && _.map(vals, v => mapping[codes[v]]));
});

function nulls(len) {
	return _.times(len, _.constant(null));
}

// For each cohort, pad missing fields with null, so they line up
// by sample when concatenated.
function extendFields(fieldsPerCohort, lengthList) {
	return _.mmap(fieldsPerCohort, lengthList, (field, len) => field || nulls(len));
}

// Concat two fieldsets, potentially having multiple fields. Join by
// position, filling with nulls for any missing fields.
// [
//   [...field0cohort0, ...field0cohort1],
//   [...nulls(len0),   ...field1cohort1],
// ]
function concatByFieldPosition(lengthList, valuesList) {
	return _.zip(...valuesList).map(fieldsPerCohort => _.concat(...extendFields(fieldsPerCohort, lengthList)));
}

// samplesList:: [[sampleID, ...], ...]
// dataList:: [fieldData, ...]
function concatValuesByFieldPosition(samplesList, dataList) {
	var values = _.map(dataList, data => _.getIn(data, ['req', 'values'])),
		lens = _.map(samplesList, s => s.length);
	return {
		req: {
			values: concatByFieldPosition(lens, values)
		}
	};
}

var remapRowSample = _.curry(
		(sampleMap, row) => _.assoc(row, 'sample', sampleMap(row.sample)));

// Rewrite sample indexes in mutation data, via (sampleMap :: int => int)
var remapSamples = (sampleMap, data) =>
	_.updateIn(data,
		   ['req', 'rows'], rows => _.map(rows, remapRowSample(sampleMap)),
		   ['req', 'samplesInResp'], sIR => _.map(sIR, sampleMap));


function computeMean(data) {
	return _.assocIn(data, ['req', 'mean'],
			_.fmap(_.getIn(data, ['req', 'values']), _.meannull));
}

function concatMutation(fieldData) {
	return {
		req: {
			rows: _.concat(...fieldData.map(wd => _.getIn(wd, ['req', 'rows']))),
				samplesInResp: _.concat(...fieldData.map(wd => _.getIn(wd, ['req', 'samplesInResp'])))
		}
	};
}

module.exports = {
	concatMutation,
	remapSamples,
	remapCodes,
	floatToCoded,
	concatByFieldPosition,
	concatValuesByFieldPosition,
	computeMean
};
