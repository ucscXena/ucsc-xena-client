/*global require: false, module: false */
'use strict';
var _ = require('underscore');
var heatmapColors = require('../heatmapColors');
var multi = require('../multi');
var fieldFetch = require('../fieldFetch');
var Rx = require('rx');
var {remapSamples, remapCodes, floatToCoded, concatValuesByFieldPosition,
		concatMutation, computeMean} = require('./fieldData');

// Strategies for joining field metadata with composite cohorts.


// normalize by default if all datasets normalize by default.
function getNormalization(datasets) {
	return _.every(datasets, d => d.colnormalization);
}

// Join column labels.
function getColumnLabel(fieldSpecs) {
	return _.uniq(_.pluck(fieldSpecs, 'columnLabel')).join(' / ');
}

// Use default color from first dataset.
function getDefaultColors(datasets) {
	return _.find(datasets, d => heatmapColors.defaultColors(d));
}

var noNullType = ts => ts.filter(t => t !== 'null');

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

// Preserve geneProbes matrix only if there's a single field and all datasets
// are geneProbes, and all have the same probemap.
function resetProbesMatrix(len, fieldSpecs, datasets) {
	return (len > 1 || !_.every(fieldSpecs, fs => fs.fieldType === 'geneProbes')
			|| _.uniq(_.map(fieldSpecs, fs => datasets[fs.dsID].probemap)).length > 1) ?
		_.map(fieldSpecs, fs => 
			  _.assoc(fs, 'fieldType', fs.fieldType === 'geneProbes' ? 'genes' : fs.fieldType)) :
		fieldSpecs;
}

// merge, dropping nulls.
var m = (...objs) => _.pick(_.merge(...objs), v => v != null);

var findFirstProp = (fieldSpecs, prop)  =>
	_.get(_.find(fieldSpecs, fs => _.has(fs, prop)), prop);

var getAssembly = (fieldType, fieldSpecs) =>
	fieldType === 'mutation' ? findFirstProp(fieldSpecs, 'assembly') : null;

var getFeature = (fieldType, fieldSpecs) =>
	fieldType === 'mutation' ? findFirstProp(fieldSpecs, 'sFeature') : null;

var getFieldLabel = fieldSpecs => findFirstProp(fieldSpecs, 'fieldLabel');

var nullField = {
	fetchType: 'null',
	valueType: 'null',
	fieldType: 'null',
	fields: []
};

var fillNullFields = fieldSpecs => _.map(fieldSpecs, fs => fs || nullField); 

function combineColSpecs(fieldSpecs, datasets) {
	var dsList = _.filter(fieldSpecs, fs => fs.dsID).map(fs => datasets[fs.dsID]),
		fields = longest(_.pluck(fieldSpecs, 'fields')),
		resetFieldSpecs = resetProbesMatrix(fields.len, fieldSpecs, datasets),
		fieldType = getFieldType(resetFieldSpecs);

	return m({
		fields,
		fieldSpecs: resetFieldSpecs,
		fetchType: 'composite',
		valueType: getValueType(resetFieldSpecs),
		fieldType,
		defaultNormalization: getNormalization(dsList),
		fieldLabel: getFieldLabel(resetFieldSpecs),
		columnLabel: getColumnLabel(resetFieldSpecs),
		defaultColors: getDefaultColors(dsList),
		assembly: getAssembly(fieldType, resetFieldSpecs),
		sFeature: getFeature(fieldType, resetFieldSpecs)
	});
}

// XXX This should be recursive, instead of having a
// length check, etc.
function getColSpec(fieldSpecs, datasets) {
	return fieldSpecs.length === 1 ? fieldSpecs[0] :
		combineColSpecs(fillNullFields(fieldSpecs), datasets);
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

// We should only join when the probemap is identical, so the probes for the composite field
// is the same as any of the constituent fields.
function setProbes(data, fdata)  {
	var probes = _.getIn(fdata, [0, 'req', 'probes']);
	return probes ? _.assocIn(data, ['req', 'probes'], probes) : data;
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

	return computeMean(setProbes(field, fdata));
});

// Combining coded fields:
// find union of codes,
// assign new values to codes,
// for each dataset
//     map val -> code -> new val.
getField.add('coded', (column, samplesList, fdata) => {
	var cvtdData = _.mmap(column.fieldSpecs, samplesList, fdata, cvtField(column)),
		allCodes = _.union(..._.pluck(cvtdData, 'codes')),
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

function fetchComposite(column, samples) {
	var {fieldSpecs} = column;
	return Rx.Observable.zipArray(fieldSpecs.map((f, i) => fieldFetch(f, [samples[i]])))
		.map(fdata => getField(column, samples, fdata));
}

function fetchNull() {
	return Rx.Observable.return(null);
}

fieldFetch.add('composite', fetchComposite);
fieldFetch.add('null', fetchNull);

module.exports = {
	getColSpec
};
