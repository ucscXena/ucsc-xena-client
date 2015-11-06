/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var multi = require('../multi');
var {colorScale} = require('../heatmapColors');
var km = require('../km'); // move km down?

var MAX = 10; // max number of groups to display.

function average(data) {
	return data[0].map((v, s) => _.meannull(data.map(p => p[s])));
}

function codedVals(column, {req: {codes}, display: {heatmap, colors}}) {
	var groups = _.range(Math.min(codes.length, MAX)),
		colorfn = _.first(colors.map(colorScale));
	return {
		groups: groups,
		colors: groups.map(colorfn),
		labels: codes,
		values: heatmap[0]
	};
}

var saveNull = fn => v => v == null ? v : fn(v);

// XXX Here we include samples that might not have tte and ev, when
// picking the range. Ideal would be to partition not including
// samples w/o survival data.
function partitionedVals(avg, uniq, codes, colorfn) {
	let vals = _.without(avg, null, undefined).sort((a, b) => a - b),
		min = _.min(vals),
		max = _.max(vals),
		low = vals[Math.round(vals.length / 3)],
		high = vals[Math.round(2 * vals.length / 3)];
	return {
		values: _.map(avg, saveNull(v => v <= low ? 'low' :
							(v <= high ? 'middle' : 'high'))),
		groups: ['low', 'middle', 'high'],
		colors: [colorfn(min), colorfn((min + max) / 2), colorfn(max)],
		labels: [`< ${low}`, `${low} to ${high}`, `> ${high}`]
	};
}

function floatVals(avg, uniq, codes, colorfn) {
	return {
		values: avg,
		groups: uniq,
		colors: uniq.map(colorfn),
		labels: uniq.map(v => v.toPrecision(6))
	};
}

// We use data.display so the values reflect normalization settings.
// We average 1st, then see how many unique values there are, then decide
// whether to partition or not.
function floatOrPartitionVals(column, {req: {codes}, display: {heatmap, colors}}) {
	var avg = average(heatmap),
		uniq = _.without(_.uniq(avg), null, undefined),
		colorfn = _.first(colors.map(colorScale));
	return (uniq.length > MAX ? partitionedVals : floatVals)(avg, uniq, codes, colorfn);
}

function featureType({dataType}, data) {
	// XXX We have a too many ad hoc checks in the code trying to decide if
	// something is coded or not, phenotype or not, etc. We need to fix this
	// across the code.
	var feature = _.getIn(data, ['req', 'probes', 0]);
	var coded = _.getIn(data, ['req', 'codes', feature]);
	return (dataType === 'mutationVector') ? 'mutation' : (coded ? 'coded' : 'float');
}

function mutationVals() {
	console.warn('fixme');
}

var toCoded = multi(featureType);
toCoded.add('float', floatOrPartitionVals);
toCoded.add('coded', codedVals);
toCoded.add('mutation', mutationVals);

var has = (obj, v) => obj[v] != null;

// Return indices of arr for which fn is true. fn is passed the value and index.
var filterIndices = (arr, fn) => _.range(arr.length).filter(i => fn(arr[i], i));

function makeGroups(column, data, {ev, tte, patient}, samples) {
	// Convert field to coded.
	let {labels, colors, groups, values} = toCoded(column, data),
		usableSamples = filterIndices(samples, (s, i) =>
			has(tte, s) && has(ev, s) && has(values, i)),
		groupedIndices = _.groupBy(usableSamples, i => values[i]),
		gtte = groups.map(g => groupedIndices[g].map(i => tte[samples[i]])),
		gev = groups.map(g => groupedIndices[g].map(i => ev[samples[i]])),
		curves = groups.map((g, i)=> km.compute(gtte[i], gev[i]));

	return {
		colors: colors,
		labels: labels,
		curves: curves
	};
}

module.exports = makeGroups;
