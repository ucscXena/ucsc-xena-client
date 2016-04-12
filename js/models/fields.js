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

function floatToCoded(data) {
	var values = floatThirds(_.getIn(data, ['req', 'values']));
	return _.assocIn(data,
			['req', 'values'], values,
			['req', 'codes'], ['low', 'middle', 'high']);
}

function nulls(len) {
	return _.times(len, _.constant(null));
}

// For each cohort, pad missing fields with null, so they line up
// by sample when concatenated.
function extendFields(fieldsPerCohort, lengthList) {
	return _.mmap(fieldsPerCohort, lengthList, (field, len) => field || nulls(len));
}

// Currently this is complicated by the fact that we've indexed the data on
// field or probe, and we are not holding the field. So we would need the fieldSpec
// in order to do the join by position. Ways we could address this:
// 1 - Keep data as [[...samplValues], ...probeValues]
//     Then it's already by position & we're done, here. For probe lookups we'd
//     build an index. When do we lookup by probe? Only when walking the probe
//     list. This indexing is a waste of time.
// 2 - Put field list in fieldData. This makes the field list more stand-alone,
//     which could be good.
// 3 - Both 1 & 2
//
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

module.exports = {
	floatToCoded,
	concatByFieldPosition,
	concatValuesByFieldPosition
};
