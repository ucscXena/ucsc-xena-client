/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var multi = require('../multi');
var {colorScale} = require('../colorScales');
var km = require('../km'); // move km down?

var MAX = 10; // max number of groups to display.

function average(data) {
	return data[0].map((v, s) => _.meannull(data.map(p => p[s])));
}

// Currently assumes we have only one field. Right now we only
// handle coded phenotype data, and limit it to one-per-column.
function codedVals({heatmap, colors, fields}, {codes}) {
	var field = fields[0],
		groups = _.range(codes[field].length),
		colorfn = _.first(colors.map(colorScale));

	return {
		groups: groups,
		colors: groups.map(colorfn),
		labels: codes[field],
		values: heatmap[0]
	};
}

var saveNull = fn => v => v == null ? v : fn(v);

// XXX Here we include samples that might not have tte and ev, when
// picking the range. Ideal would be to partition not including
// samples w/o survival data.
function partitionedVals(avg, uniq, colorfn) {
	let vals = _.without(avg, null, undefined).sort((a, b) => a - b),
		min = _.min(vals),
		max = _.max(vals),
		low = vals[Math.round(vals.length / 3)],
		high = vals[Math.round(2 * vals.length / 3)],
		labelLow = low.toPrecision(4),
		labelHigh = high.toPrecision(4);
	return {
		values: _.map(avg, saveNull(v => v < low ? 'low' :
							(v < high ? 'middle' : 'high'))),
		groups: ['low', 'middle', 'high'],
		colors: [colorfn(min), colorfn((min + max) / 2), colorfn(max)],
		labels: [`< ${labelLow}`, `${labelLow} to ${labelHigh}`, `>= ${labelHigh}`]
	};
}

function floatVals(avg, uniq, colorfn) {
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
function floatOrPartitionVals({heatmap, colors}) {
	var warning = heatmap.length > 1 ? 'gene-level average' : undefined,
		avg = average(heatmap),
		uniq = _.without(_.uniq(avg), null, undefined),
		colorfn = _.first(colors.map(colorScale));
	return {warning, ...(uniq.length > MAX ? partitionedVals : floatVals)(avg, uniq, colorfn)};
}

function featureType({dataType, fields}, data) {
	// XXX We have a too many ad hoc checks in the code trying to decide if
	// something is coded or not, phenotype or not, etc. We need to fix this
	// across the code.
	var feature = _.get(fields, 0);
	var coded = _.getIn(data, ['codes', feature]);
	return (dataType === 'mutationVector') ? 'mutation' : (coded ? 'coded' : 'float');
}

function mutationVals(column, data, {bySample}, sortedSamples) {
	var mutCode = _.mapObject(bySample, vs => vs.length > 0 ? 1 : 0);
	return {
		values: _.map(sortedSamples, s => mutCode[s]),
		groups: [0, 1],
		colors: [
			"#ffffff", // white
			"#9467bd"  // dark purple
		],
		labels: [
			'No Mutation',
			'Has Mutation'
		]
	};
}

var toCoded = multi(featureType);
toCoded.add('float', floatOrPartitionVals);
toCoded.add('coded', codedVals);
toCoded.add('mutation', mutationVals);

var has = (obj, v) => obj[v] != null;

// Return indices of arr for which fn is true. fn is passed the value and index.
var filterIndices = (arr, fn) => _.range(arr.length).filter(i => fn(arr[i], i));

// Give tte and ev for each subgroup, compute p-value.
// Not sure why we recombine the data after splitting by group.
function pValue(groupsTte, groupsEv) {
	var allTte = _.flatten(groupsTte),
		allEv = _.flatten(groupsEv);

	return km.logranktest(
			// Only use points with an event
			km.compute(allTte, allEv).filter(point => point.e),
			groupsTte,
			groupsEv);
}

function warnDupPatients(usableSamples, samples, patient) {
	const getPatient = i => patient[samples[i]],
		havePatient = usableSamples.filter(getPatient),
		dups = _.difference(havePatient, _.uniq(havePatient, false, getPatient));

	return dups.length ? `Some individuals' survival data are used more than once in the KM plot. Affected samples are: ${dups.map(i => samples[i]).join(', ')}. For more information and how to remove such duplications: https://goo.gl/TSQt6z.` : null;
}

function filterByGroups(feature, groupedIndices) {
	var {labels, colors, groups} = feature,
		notEmpty = _.range(groups.length).filter(i => _.has(groupedIndices, groups[i])),
		useIndices = notEmpty.slice(0, MAX),
		nlabels = useIndices.map(i => labels[i]),
		ncolors = useIndices.map(i => colors[i]),
		ngroups = useIndices.map(i => groups[i]);

	return {
		labels: nlabels,
		colors: ncolors,
		groups: ngroups,
		warning: notEmpty.length > MAX ? `Limited drawing to ${MAX} categories` : undefined,
	};
}

// After toCoded, we can still end up with empty groups if
// we don't have survival data for the samples in question.
// So, picking MAX groups after filtering for survival data.
// Order should be
// 1) convert to coded feature
// 2) filter usable samples
// 3) drop empty groups
// 4) pick at-most MAX groups
// 5) compute km

function makeGroups(column, data, index, survival, samples) {
	let {tte: {data: tte}, ev: {data: ev}, patient: {data: patient}} = survival,
		// Convert field to coded.
		codedFeat = toCoded(column, data, index, samples),
		{values} = codedFeat,
		usableSamples = filterIndices(samples, (s, i) =>
			has(tte, s) && has(ev, s) && has(values, i)),
		patientWarning = warnDupPatients(usableSamples, samples, patient),
		groupedIndices = _.groupBy(usableSamples, i => values[i]),
		usableData = filterByGroups(codedFeat, groupedIndices),
		{groups, colors, labels, warning} = usableData,
		gtte = groups.map(g => groupedIndices[g].map(i => tte[samples[i]])),
		gev = groups.map(g => groupedIndices[g].map(i => ev[samples[i]])),
		curves = groups.map((g, i)=> km.compute(gtte[i], gev[i])),
		pV = pValue(gtte, gev);

	return {
		colors,
		labels,
		curves,
		warning,
		patientWarning,
		...pV
	};
}

var featureID = (dsID, feature) => ({
	dsID: dsID,
	name: _.getIn(feature, ['name'])
});

function pickSurvivalVars(featuresByDataset, user) {
	var allFeatures = _.flatmap(featuresByDataset,
			(features, dsID) => _.map(features, f => featureID(dsID, f))),
		ev = _.find(allFeatures, ({name}) => name === '_EVENT'),
		tte = _.find(allFeatures, ({name}) => name === '_TIME_TO_EVENT'),
		patient = _.find(allFeatures, ({name}) => name === '_PATIENT');

	return {
		ev: _.getIn(user, ['ev'], ev),
		tte: _.getIn(user, ['tte'], tte),
		patient: _.getIn(user, ['patient'], patient)
	};
}

module.exports = {makeGroups, pickSurvivalVars};
