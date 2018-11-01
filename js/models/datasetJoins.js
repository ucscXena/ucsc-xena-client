'use strict';
var _ = require('underscore');
var multi = require('../multi');
var fieldFetch = require('../fieldFetch');
var Rx = require('../rx');
var {remapSamples, remapCodes, floatToCoded, concatValuesByFieldPosition,
		concatMutation, computeMean} = require('./fieldData');
var samplesFrom = require('../samplesFrom');
var {nullField} = require('./fieldSpec');

// Strategies for joining field metadata with composite cohorts.

var nonNullFS = fss => fss.filter(fs => fs.fetchType !== 'null');

// normalize by default if all datasets normalize by default.
function getNormalization(fieldSpecs) {
	var allDefaultNormalization = _.uniq(_.map(nonNullFS(fieldSpecs), d => d.defaultNormalization));
	if (allDefaultNormalization.length === 1 & allDefaultNormalization[0] != null) {
		return allDefaultNormalization[0];
	} else {
		return false;
	}
}

// Join column labels.
function getColumnLabel(fieldSpecs) {
	return _.uniq(_.pluck(nonNullFS(fieldSpecs), 'columnLabel')).join(' / ');
}

var noNullType = ts => ts.filter(t => t !== 'null');

// Use default color from first dataset.
function getColorClass(fieldSpecs) {
	var types = _.uniq(noNullType(_.pluck(fieldSpecs, 'colorClass')));

	// If all types are the same, preserve the type.
	if (types.length === 1) {
		return types[0];
	}

	// If any are clinical, color as clinical
	if (_.contains(types, 'clinical')) {
		return 'clinical';
	}

	// color as default genomic
	return 'default';
}

// XXX Need to handle incompatible assemblies in mutation.
function getValueType(fieldSpecs) {
	var types = _.uniq(noNullType(_.pluck(fieldSpecs, 'valueType')));

	// If all types are the same, we can preserve the type.
	if (types.length === 1) {
		return types[0];
	}

	// If coded, cast to coded.
	if (_.contains(types, 'coded')) {
		return 'coded';
	}

	// Any other combination, float
	return 'float';
}

// probes, genes, geneProbes, clinical, mutation.
// We shouldn't see geneProbes unless they're all the same.
function getFieldType(fieldSpecs) {
	var types = _.uniq(noNullType(_.pluck(fieldSpecs, 'fieldType')));

	// If all types are the same, we can preserve the type.
	if (types.length === 1) {
		return types[0];
	}

	// drop genomic info if mixing with clinincal
	if (_.contains(types, 'clinical')) {
		return 'clinical';
	}

	// treat disparate field types as probes.
	return 'probes';
}

function longest(arrs) {
	return _.max(arrs, arr => arr.length);
}

function hasUniqProbemap(fieldSpecs, datasets) {
	var probemaps = _.map(fieldSpecs, fs => _.getIn(datasets, [fs.dsID, 'probemap']));
	return _.uniq(_.filter(probemaps, _.identity)).length  === 1;
}

// Preserve geneProbes matrix only if there's a single field and all datasets
// are geneProbes, and all have the same probemap.
function resetProbesMatrix(len, fieldSpecs, uniqProbemap) {
	var nnFS = nonNullFS(fieldSpecs);
	return (len > 1 || !_.every(nnFS, fs => fs.fieldType === 'geneProbes') || !uniqProbemap) ?
		 _.map(fieldSpecs, fs =>
				_.assoc(fs, 'fieldType', fs.fieldType === 'geneProbes' ? 'genes' : fs.fieldType)) :
		fieldSpecs;
}

// merge, dropping nulls.
var m = (...objs) => _.pick(_.merge(...objs), v => v != null);

var findFirstProp = (fieldSpecs, prop)  =>
	_.get(_.find(fieldSpecs, fs => _.has(fs, prop)), prop);

var hasAssembly = fieldType => ['mutation', 'SV', 'segmented'].indexOf(fieldType) !== -1;
var hasSFeature = hasAssembly;

var getAssembly = (fieldType, fieldSpecs) =>
	hasAssembly(fieldType) ? findFirstProp(fieldSpecs, 'assembly') : null;

var getFeature = (fieldType, fieldSpecs) =>
	hasSFeature(fieldType) ? findFirstProp(fieldSpecs, 'sFeature') : null;

var getFieldLabel = fieldSpecs => findFirstProp(fieldSpecs, 'fieldLabel');

var getShowIntrons = fieldSpecs => findFirstProp(fieldSpecs, 'showIntrons');

var fillNullFields = fieldSpecs => _.map(fieldSpecs, fs => fs || nullField);

// Create a composite fieldSpec from a list of fieldSpecs. This uses
// a number of heuristics to determine the 'best' combined view over
// the fieldSpecs, for some definition of 'best'.
//
// For genes/geneProbes, we might have geneProbes fields on different
// probemaps, in which case we want to coerce to 'genes', and prevent the
// user from picking 'geneProbes'. We reset the fieldType here, and set the
// 'noGeneDetail' flag to inform the UI that we can't support a 'geneProbes' view.

function combineColSpecs(fieldSpecs, datasets) {
	var fields = longest(_.pluck(fieldSpecs, 'fields')),
		uniqProbemap = hasUniqProbemap(fieldSpecs, datasets),
		resetFieldSpecs = resetProbesMatrix(fields.len, fieldSpecs, uniqProbemap),
		fieldType = getFieldType(resetFieldSpecs);

	return m({
		...(getShowIntrons(resetFieldSpecs) ? {showIntrons: true} : {}),
		...(fieldSpecs[0].vizSettings ? _.pick(fieldSpecs[0], 'vizSettings') : {}),
		fields,
		fieldSpecs: resetFieldSpecs,
		fetchType: 'composite',
		valueType: getValueType(resetFieldSpecs),
		fieldType,
		defaultNormalization: getNormalization(resetFieldSpecs),
		fieldLabel: getFieldLabel(resetFieldSpecs),
		columnLabel: getColumnLabel(resetFieldSpecs),
		colorClass: getColorClass(resetFieldSpecs),
		noGeneDetail: !uniqProbemap, // XXX is this wrong? also have to check field len.
		assembly: getAssembly(fieldType, resetFieldSpecs),
		sFeature: getFeature(fieldType, resetFieldSpecs), // XXX deprecate?
		clustering: _.get(fieldSpecs[0], 'clustering'),
		// until we ditch composite, copy these for signatures
		dsID: _.get(fieldSpecs[0], 'dsID'),
		missing: _.get(fieldSpecs[0], 'missing'),
	});
}

// The original idea of fieldSpec was for it to be recursive, so
// we could write nested expression (e.g. signatures). However, there's
// some problem in the data modeling wrt cohorts: how does the list of
// samples connect to a particular fieldSpec? So, here we always return
// a 'composite', even for single datasets.
function getColSpec(fieldSpecs, datasets) {
	return combineColSpecs(fillNullFields(fieldSpecs), datasets);
}

// Convert field valueType.
// (column, fieldSpec, samples, data) => newData
var cvtField = multi((column, field) => `${field.valueType}->${column.valueType}`, 4);

// For probes, genes, data is
// req: {values: {[probe]: {sample: value, ...}, ...}}
cvtField.dflt = (column, fieldSpec, samples, data) => data;

// Column must be single-valued prior to trying to convert to coded.
cvtField.add('float->coded',
		(column, fieldSpec, samples, data) => floatToCoded(data));

cvtField.add('null->coded', () => {
	return {
		codes: [],
		req: {
			values: [],
			mean: []
		}
	};
});

cvtField.add('null->float', () => {
	return {
		req: {
			values: [],
			mean: []
		}
	};
});

cvtField.add('null->mutation', () => {
	return {
		req: {
			rows: [],
			samplesInResp: []
		}
	};
});

cvtField.add('mutation->float', (column, field, samples, acc, data) => {
	var bySampleID = _.groupBy(data.rows, 'sampleID');
	return {
		req: {
			values: _.map(samples, id => bySampleID[id].length > 0 ? 1 : 0)
		}
	};
});

// We are computing bySample also in the app selector.
cvtField.add('mutation->coded', (column, field, samples, acc, data) => {
	var bySampleID = _.groupBy(data.rows, 'sampleID');
	return {
		req: {
			codes: ['no mutation', 'has mutation'],
			values: _.map(samples, id => bySampleID[id].length > 0 ? 1 : 0)
		}
	};
});


function mergeField(field, data, fdata) {
	var v = _.getIn(fdata, [0, 'req', field]);
	return v ? _.assocIn(data, ['req', field], v) : data;
}

// We should only join when the probemap is identical, so the probes for the composite field
// is the same as any of the constituent fields.
function setProbes(initData, fdata)  {
	return ['probes', 'position']
		.reduce((data, field) => mergeField(field, data, fdata), initData);
}

// We don't want a reducing function for getField 'mutation'.
var getField = multi(column => column.valueType);

// Combining float fields:
// concat all fields by position,
// copy probe list,
// compute mean.
getField.add('float', (column, samplesList, fdata) => {
	var cvtdData = _.mmap(column.fieldSpecs, samplesList, fdata, cvtField(column)),
		field = concatValuesByFieldPosition(samplesList, cvtdData);

	return _.assoc(computeMean(setProbes(field, fdata)),
		'refGene', findFirstProp(fdata, 'refGene'));
});

// Combining coded fields:
// find union of codes,
// assign new values to codes,
// for each dataset
//     map val -> code -> new val.
getField.add('coded', (column, samplesList, fdata) => {
	var cvtdData = _.mmap(column.fieldSpecs, samplesList, fdata, cvtField(column)),
		// We reverse prior to taking the union so that codes from the top cohort
		// will tend to appear on the top of the heatmap (higher values).
		allCodes = _.union(..._.pluck(_.reverse(cvtdData), 'codes')),
		mapping = _.object(allCodes, _.range(allCodes.length)),
		remappedWdata = _.map(cvtdData, remapCodes(mapping));
	return _.assoc(concatValuesByFieldPosition(samplesList, remappedWdata),
		'codes', allCodes);
});

// Combining mutation fields.
// Require same refGene.
// Map sampleIDs to their order in cohort samples.
getField.add('mutation', (column, samples, fdata) => {
	var sampleOffsets = _.initial(_.scan(samples, (acc, list) => acc + list.length, 0)),
		sampleMaps = _.map(sampleOffsets, offset => s => s + offset),
		remappedFdata = _.mmap(sampleMaps, fdata, remapSamples);

	return _.assoc(concatMutation(remappedFdata),
		'refGene', findFirstProp(fdata, 'refGene'));
});

// Combining segmented fields.
// Require same refGene.
// Map sampleIDs to their order in cohort samples.
getField.add('segmented', (column, samples, fdata) => {
	var sampleOffsets = _.initial(_.scan(samples, (acc, list) => acc + list.length, 0)),
		sampleMaps = _.map(sampleOffsets, offset => s => s + offset),
		remappedFdata = _.mmap(sampleMaps, fdata, remapSamples);

	return _.assoc(concatMutation(remappedFdata),
		'refGene', findFirstProp(fdata, 'refGene'));
});


// XXX deprecate this
function fetchComposite(column, samples) {
	var {fieldSpecs} = column;
	return Rx.Observable.zipArray(fieldSpecs.map(f => fieldFetch(f, samples)))
		.map(fdata => getField(column, samples, fdata));
}

function fetchNull() {
	return Rx.Observable.of(null);
}

fieldFetch.add('composite', fetchComposite);
fieldFetch.add('null', fetchNull);

function samplesFromComposite(fieldSpec) {
	return Rx.Observable.zipArray(fieldSpec.fieldSpecs.map(fs => samplesFrom(fs)))
		.map(sfs => _.map(sfs, sf => sf[0]));
}

samplesFrom.add('composite', samplesFromComposite);
samplesFrom.add('null', () => Rx.Observable.of([[]], Rx.Scheduler.asap));

module.exports = {
	getColSpec
};
