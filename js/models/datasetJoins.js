/*global require: false, module: false */
'use strict';
var _ = require('underscore');
var heatmapColors = require('../heatmapColors');
var multi = require('../multi');
var fieldFetch = require('../fieldFetch');
var Rx = require('rx');
var {concatValuesByFieldPosition} = require('./fields');

// Strategies for joining field metadata with composite cohorts.


// normalize by default if all datasets normalize by default.
function getNormalization(datasets) {
	return _.every(datasets, d => d.colnormalization);
}

// Use field label from first dataset.
function getFieldLabel(fieldSpecs) {
	return _.first(fieldSpecs).fieldLabel;
}

// Join column labels.
function getColumnLabel(fieldSpecs) {
	return _.uniq(_.pluck(fieldSpecs, 'columnLabel')).join(' / ');
}

// Use default color from first dataset.
function getDefaultColors(datasets) {
	return _.find(datasets, d => heatmapColors.defaultColors(d));
}

// Demote to float. Really should have a type for coded.
// clinicalMatrix
// geneMatrix
// geneProbesMatrix
// probeMatrix
// mutationVector
// demotion

// Any clinical float -> cast everything to clinical float.
// categorical, mutation -> categorical
// categorical + genomic float -> clinical float
//
//
// mutation goes to categorical if all others are categorical.
// mutation or categorical + genomic float -> clinical float.
// 
// any clinical float -> all clinical float.
//
// combine by position.
// genomic or not
// float or not
//
// float, coded, or mutation
//     float if any float. coded if coded or coded + mutation.
// if float, genomic or phenotype
// if genomic, what dataSubType

function getFieldSpecDisplayType(colSpec, features) {
	var [first] = colSpec.fields;
	if (colSpec.dataType === 'clinicalMatrix') {
		if (_.getIn(features, [first, 'valueType']) === 'categorical') {
			return 'coded';
		}
		return 'clinicalFloat';
	}
	if (colSpec.dataType === 'mutationVector') {
		return 'mutation';
	}
	return 'genomicFloat';
}

// XXX Need a better name for the data that specifies what we are reqesting from the
// server: a dataset id (with associated data type), and a list of fields.
// XXX Need to handle incompatible assemblies in mutation.
// XXX need to coerce geneProbe to gene if other fields are not the same gene on the same probemap.
function getDisplayType(fieldSpecs, features) {
	var types = _.uniq(fieldSpecs.map(fs => getFieldSpecDisplayType(fs, features)));

	// If all types are the same, we can preserve the type.
	if (types.length === 1) {
		return types[0];
	}
	
	// We can cast mutation to coded (boolean).
	if (_.every(types, t => _.contains(['mutation', 'coded'], t))) {
		return 'coded';
	}

	// Any other combination, the best we can do is clinicalFloat.
	return 'clinicalFloat';
}

// geneMatrix, geneProbeMatrix, probeMatrix, clinicalMatrix, mutationVector
// clinicalFloat -> clinicalMatrix
// coded -> clinicalMatrix
// Why does plotDenseMatrix have this distinction? So it can switch modes?
// genomicFloat -> probemap ? (len > 1 ? geneMatrix : geneProbesMatrix) : probeMatrix
// mutation -> mutationVector

function fudgeDataType(displayType) {
	return {
		mutation: 'mutationVector',
		coded: 'clincalMatrix',
		clinicalFloat: 'clinicalMatrix',
		genomicFloat: 'probeMatrix'
	}[displayType];
}

function longest(arrs) {
	return _.max(arrs, arr => arr.length);
}

function resetProbesMatrix(len, fieldSpecs) {
	return (len > 1 || !_.every(fieldSpecs, fs => fs.dataType === 'geneProbesMatrix')) ?
		_.map(fieldSpecs, fs => 
			  _.assoc(fs, 'dataType', fs.dataType === 'geneProbesMatrix' ? 'geneMatrix' : fs.dataType)) :
		fieldSpecs;
}

function getColSpec(fieldSpecs, datasets, features) {
	var dsList = fieldSpecs.map(fs => datasets[fs.dsID]),
		fields = longest(_.pluck(fieldSpecs, 'fields'));
	return {
		fields,
		fieldSpecs: resetProbesMatrix(fields.len, fieldSpecs),
		dataType: fudgeDataType(getDisplayType(fieldSpecs, features)),
		defaultNormalization: getNormalization(dsList),
		fieldLabel: getFieldLabel(fieldSpecs),
		columnLabel: getColumnLabel(fieldSpecs),
		defaultColors: getDefaultColors(dsList)
	};
}

function computeMean(data) {
	return _.assocIn(data, ['req', 'mean'], _.fmap(_.getIn(data, ['req', 'values']), _.meannan));
}

// Convert field valueType.
// (column, fieldSpec, samples, data) => newData
var cvtField = multi((column, field) => `${field.valueType}->${column.valueType}`, 4);

// For probeMatrix, geneMatrix, data is
// req: {values: {[probe]: {sample: value, ...}, ...}}
cvtField.dflt = (column, fieldSpec, samples, data) => data;

var saveNull = fn => v => v == null ? v : fn(v);

// XXX This is repeated in km.js
function toCoded(floatVals) {
	let sorted = _.without(floatVals, null, undefined).sort((a, b) => a - b),
		low = sorted[Math.round(sorted.length / 3)],
		high = sorted[Math.round(2 * sorted.length / 3)],
		values = _.map(floatVals, saveNull(v => v < low ? 0 :
							(v < high ? 1 : 2)));
	return {
		values,
		codes: ['low', 'middle', 'high']
	};
}

// Column must be single-valued prior to trying to convert to coded.
cvtField.add('float->coded', (column, fieldSpec, samples, data) => {
	var {values, codes} = toCoded(_.getIn(data, ['req', 'values', 0]));
	return _.assocIn(data, ['req', 'values'], [values], ['codes'], codes);
});

//cvtField.add('coded->coded', (column, field, samples, acc, data) => {
//	return data;
//});

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
function setProbes(data, wdata)  {
	var probes = _.getIn(wdata, [0, 'req', 'probes']);
	return probes ? _.assocIn(data, ['req', 'probes'], probes) : data;
}

// We don't want a reducing function for getField 'mutation'.
function joinFieldData(column, samples, wdata) {
	return _.reduce(_.zip(column.fieldSpecs, wdata), (acc, [fs, data]) => cvtField(column, fs, samples, acc, data), {});
}

var getField = multi(column => column.valueType);

// Combining float fields:
// concat all fields by position,
// copy probe list,
// compute mean.
getField.add('float', (column, samplesList, wdata) => {
	var cvtdData = _.mmap(column.fieldSpecs, samplesList, wdata, cvtField(column)),
		field = concatValuesByFieldPosition(samplesList, cvtdData);

	return computeMean(setProbes(field, wdata));
});

// Combining coded fields:
// find union of codes,
// assign new values to codes,
// for each dataset
//     map val -> code -> new val.
getField.add('coded', (column, samplesList, wdata) => {
	var cvtdData = _.mmap(column.fieldSpecs, samplesList, wdata, cvtField(column)),
		allCodes = _.union(..._.pluck(cvtdData, 'codes')),
		mapping = _.object(allCodes, _.range(allCodes.length)),
		remappedWdata = _.mmap(column.fieldSpecs, cvtdData, (fs, wd) => {
			var codes = _.get(wd, 'codes');
			return _.updateIn(wd, ['req', 'values', 0], vals => _.map(vals, v => mapping[codes[v]]));
		});
	return _.assoc(concatValuesByFieldPosition(samplesList, remappedWdata), 'codes', allCodes);
});

// Combining mutation fields.
// Require same refGene.
// Map sampleIDs to their order in cohort samples.
getField.add('mutation', (column, samples, wdata) => {
	var sampleOffsets = _.scan(samples, (acc, list) => acc + list.length, 0),
		sampleMaps = _.map(sampleOffsets, offset => s => s + offset),
		remappedWdata = _.mmap(sampleMaps, wdata, (sampleMap, data) =>
			_.updateIn(data,
					   ['req', 'rows'], rows => _.map(rows, row => _.assoc(row, 'sample', sampleMap(row.sample))),
					   ['req', 'samplesInResp'], sIR => _.map(sIR, sampleMap)));
	return {
		req: {
			rows: _.concat(...remappedWdata.map(wd => _.getIn(wd, ['req', 'rows']))),
			samplesInResp: _.concat(...remappedWdata.map(wd => _.getIn(wd, ['req', 'samplesInResp'])))
		},
		refGene: _.getIn(wdata, [0, 'refGene'])
	};
});

function fetchComposite(column, samples) {
	var {fieldSpecs} = column;
	return Rx.Observable.zipArray(fieldSpecs.map((f, i) => fieldFetch(f, [samples[i]])))
		.map(wdata => getField(column, samples, wdata));
}

fieldFetch.add('composite', fetchComposite);

module.exports = {
	getColSpec,
	joinFieldData
};
