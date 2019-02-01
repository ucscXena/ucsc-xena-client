'use strict';
var _ = require('../underscore_ext');
var multi = require('../multi');
var {colorScale} = require('../colorScales');
var km = require('../km'); // move km down?
var {RGBToHex} = require('../color_helper');
//var {segmentAverage} = require('./segmented');

var MAX = 10; // max number of groups to display.

var getSplits = (splits) => splits ? splits : 2;

var survivalOptions = {
	"osEv": {
		patient: 'patient',
		ev: 'osEv',
		tte: 'osTte',
		evFeature: 'OS',
		tteFeature: 'OS.time',
		label: 'Overall survival'
	},
	"dssEv": {
		patient: 'patient',
		ev: 'dssEv',
		tte: 'dssTte',
		evFeature: 'DSS',
		tteFeature: 'DSS.time',
		label: 'Disease specific survival'
	},
	"ddfsEv": {
		patient: 'patient',
		ev: 'ddfsEv',
		tte: 'ddfsTte',
		evFeature: 'DDFS',
		tteFeature: 'DDFS.time',
		label: 'Distant disease free survival'
	},
	"dmfsEv": {
		patient: 'patient',
		ev: 'dmfsEv',
		tte: 'dmfsTte',
		evFeature: 'DMFS',
		tteFeature: 'DMFS.time',
		label: 'Distant metastasis free survival'
	},
	"idfsEv": {
		patient: 'patient',
		ev: 'idfsEv',
		tte: 'idfsTte',
		evFeature: 'IDFS',
		tteFeature: 'IDFS.time',
		label: 'Invasive disease free survival'
	},
	"dfiEv": {
		patient: 'patient',
		ev: 'dfiEv',
		tte: 'dfiTte',
		evFeature: 'DFI',
		tteFeature: 'DFI.time',
		label: 'Disease free interval'
	},
	"pfiEv": {
		patient: 'patient',
		ev: 'pfiEv',
		tte: 'pfiTte',
		evFeature: 'PFI',
		tteFeature: 'PFI.time',
		label: 'Progression free interval'
	},
	"lriEv": {
		patient: 'patient',
		ev: 'lriEv',
		tte: 'lriTte',
		evFeature: 'LRI',
		tteFeature: 'LRI.time',
		label: 'Local recurrence interval'
	},
	"rrEv": {
		patient: 'patient',
		ev: 'rrEv',
		tte: 'rrTte',
		evFeature: 'RR',
		tteFeature: 'RR.time',
		label: 'Regional recurrence'
	},
	"driEv": {
		patient: 'patient',
		ev: 'driEv',
		tte: 'driTte',
		evFeature: 'DRI',
		tteFeature: 'DRI.time',
		label: 'Distant recurrence interval'
	},
	"dmiEv": {
		patient: 'patient',
		ev: 'dmiEv',
		tte: 'dmiTte',
		evFeature: 'DMI',
		tteFeature: 'DMI.time',
		label: 'Distant metastasis interval'
	},
	"mEv": {
		patient: 'patient',
		ev: 'mEv',
		tte: 'mTte',
		evFeature: 'Metastasis',
		tteFeature: 'Metastasis.time',
		label: 'Metastasis'
	},
	"rEv": {
		patient: 'patient',
		ev: 'rEv',
		tte: 'rTte',
		evFeature: 'Relapse',
		tteFeature: 'Relapse.time',
		label: 'Relapse'
	},
	"ev": {
		patient: 'patient',
		ev: 'ev',
		tte: 'tte',
		evFeature: '_EVENT',
		tteFeature: '_TIME_TO_EVENT',
		label: 'Survival'
	}
};

function average(data) {
	return data[0].map((v, s) => _.meannull(data.map(p => p[s])));
}

// Currently assumes we have only one field. Right now we only
// handle coded phenotype data, and limit it to one-per-column.
function codedVals({heatmap, colors, fields}, {codes}) {
	var groups = _.range(codes.length),
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
function partitionedVals3(avg, uniq, colorfn) { //eslint-disable-line no-unused-vars
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

function partitionedValsQuartile(avg, uniq, colorfn) {
	let vals = _.without(avg, null, undefined).sort((a, b) => a - b),
		min = _.min(vals),
		max = _.max(vals),
		low = vals[Math.round(vals.length / 4)],
		high = vals[Math.round(3 * vals.length / 4)],
		labelLow = low.toPrecision(4),
		labelHigh = high.toPrecision(4);
	return {
		values: _.map(avg, saveNull(v => v < low ? 'low' : (v > high ? 'high' : null))),
		groups: ['low', 'high'],
		colors: [colorfn(min), colorfn(max)],
		labels: [`< ${labelLow}`, `> ${labelHigh}`]
	};
}

function partitionedVals2(avg, uniq, colorfn) {
	let vals = _.without(avg, null, undefined).sort((a, b) => a - b),
		min = _.min(vals),
		max = _.max(vals),
		mid = vals[Math.round(vals.length / 2)],
		labelMid = mid.toPrecision(4);
	return {
		values: _.map(avg, saveNull(v => v < mid ? 'low' : 'high')),
		groups: ['low', 'high'],
		colors: [colorfn(min), colorfn(max)],
		labels: [`< ${labelMid}`, `>= ${labelMid}`]
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
function floatOrPartitionVals({heatmap, colors}, data, index, samples, splits) {
	var clarification = heatmap.length > 1 ? 'average' : undefined,
		avg = average(heatmap),
		uniq = _.without(_.uniq(avg), null, undefined),
		colorfn = _.first(colors.map(colorScale)),
		partFn = splits === -4 ? partitionedValsQuartile : splits === 3 ? partitionedVals3 : partitionedVals2,
		maySplit = uniq.length > MAX;
	return {clarification, maySplit, ...(maySplit ? partFn : floatVals)(avg, uniq, colorfn)};
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

//var avgOrNull = (rows, xzoom) => _.isEmpty(rows) ? null : segmentAverage(rows, xzoom);

function segmentedVals(column, data, index, samples, splits) {
	var {color} = column,
		avg = _.getIn(data, ['avg', 'geneValues', 0]),
		bySampleSortAvg = samples.map( sample => avg[sample]),  // ordered by current sample sort
		uniq = _.without(_.uniq(avg), null, undefined),
		scale = colorScale(color),
		[,,,, origin] = color,
		colorfn = v => RGBToHex(...v < origin ? scale.lookup(0, origin - v) : scale.lookup(1, v - origin)),
		partFn = splits === -4 ? partitionedValsQuartile : splits === 3 ? partitionedVals3 : partitionedVals2;
	return {maySplit: true, ...partFn(bySampleSortAvg, uniq, colorfn)};
}

var toCoded = multi(fs => fs.valueType);
toCoded.add('float', floatOrPartitionVals);
toCoded.add('coded', codedVals);
toCoded.add('mutation', mutationVals);
toCoded.add('segmented', segmentedVals);

var has = (obj, v) => obj[v] != null;

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

	return dups.length ?
		`Some individuals' survival data are used more than once in the KM plot.
		There are ${dups.length} samples affected.
		For more information and how to remove such duplications,
		see http://xena.ucsc.edu/km-filtering-out/ .`
		: null;
}

function filterByGroups(feature, groupedIndices) {
	var {labels, colors, groups, clarification} = feature,
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
		clarification: clarification
	};
}

var getFieldData = survival =>
	_.mapObject(survival, f => _.getIn(f, ['data', 'req', 'values', 0]));

function cutoffData(survivalData, cutoff) {
	if (cutoff == null) {
		return survivalData;
	}
	let {tte, ev, patient} = survivalData,
		ctte = _.map(tte, tte => tte >= cutoff ? cutoff : tte),
		cev = _.map(ev, (ev, i) => tte[i] >= cutoff ? 0 : ev);
	return {
		tte: ctte,
		ev: cev,
		patient
	};
}

function findSurvDataByType(survivalData, survivalType) {
	var	eligibleSurv = _.keys(survivalOptions);

	survivalType = survivalType ? survivalType :
		_.intersection(_.keys(survivalData), eligibleSurv)[0];

	if (eligibleSurv.indexOf(survivalType) === -1) {
		return null;
	}

	return {
		patient: survivalData[survivalOptions[survivalType].patient],
		tte: survivalData[survivalOptions[survivalType].tte],
		ev: survivalData[survivalOptions[survivalType].ev]
	};
}

var bounds = x => [_.minnull(x), _.maxnull(x)];

// After toCoded, we can still end up with empty groups if
// we don't have survival data for the samples in question.
// So, picking MAX groups after filtering for survival data.
// Order should be
// 1) convert to coded feature
// 2) filter usable samples
// 3) drop empty groups
// 4) pick at-most MAX groups
// 5) compute km

function makeGroups(column, data, index, cutoff, splits, survivalType, survival, samples) {
	let survivalData = findSurvDataByType(getFieldData(survival), survivalType),
		domain = bounds(survivalData.tte),
		{tte, ev, patient} = cutoffData(survivalData, cutoff),
		// Convert field to coded.
		codedFeat = toCoded(column, data, index, samples, getSplits(splits)),
		{values} = codedFeat,
		usableSamples = _.filterIndices(samples, (s, i) =>
			has(tte, s) && has(ev, s) && has(values, i)),
		patientWarning = warnDupPatients(usableSamples, samples, patient),
		groupedIndices = _.groupBy(usableSamples, i => values[i]),
		usableData = filterByGroups(codedFeat, groupedIndices),
		{groups, colors, labels, warning, clarification} = usableData,
		gtte = groups.map(g => groupedIndices[g].map(i => tte[samples[i]])),
		gev = groups.map(g => groupedIndices[g].map(i => ev[samples[i]])),
		curves = groups.map((g, i) => km.compute(gtte[i], gev[i])),
		pV = pValue(gtte, gev);

	return {
		colors,
		labels,
		curves,
		warning,
		clarification,
		patientWarning,
		domain,
		maySplit: codedFeat.maySplit,
		...pV
	};
}

var toDsID = (host, name) => JSON.stringify({host, name});

var allFeatures = cohortFeatures =>
	_.flatmap(cohortFeatures, (datasets, server) =>
		_.flatmap(datasets, (features, dataset) =>
			_.map(features, f => ({dsID: toDsID(server, dataset), name: f.name}))));

var featuresByName = cohortFeatures =>
	_.Let((all = allFeatures(cohortFeatures)) =>
			_.object(_.pluck(all, 'name'), all));

// 'user' is passed the spreadsheet.km object, which
// holds user override of the survival columns.
// XXX This is all a bit wrong, because feature names are not unique
// across datasets.
function pickSurvivalVars(cohortFeatures, user) {
	var byName = featuresByName(cohortFeatures),
		patient = byName._PATIENT || byName.sampleID,
		featureMapping = _.flatmap(survivalOptions, option => [
			[option.ev, _.getIn(user, [option.ev], byName[option.evFeature])],
			[option.tte, _.getIn(user, [option.tte], byName[option.tteFeature])]
		]);

	return _.assoc(_.object(featureMapping),
			'patient', _.getIn(user, [`patient`], patient));
}

module.exports = {makeGroups, pickSurvivalVars, survivalOptions, getSplits};
