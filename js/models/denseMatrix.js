/*global require: false, module: false */
'use strict';
var _ = require('../underscore_ext');
var Rx = require('rx');
var {map, find} = _;
var xenaQuery = require('../xenaQuery');
var heatmapColors = require('../heatmapColors');
var widgets = require('../columnWidgets');
var {greyHEX} = require('../color_helper');

var {datasetProbeValues, datasetGeneProbeAvg, datasetGeneProbesValues,
		fieldCodes} = xenaQuery;

function second(x, y) {
	return y;
}

function saveMissing(fn) {
	return function (v) {
		return v == null ? v : fn(v);
	};
}

function subbykey(subtrahend, key, val) {
	return val - subtrahend[key];
}

// Decide whether to normalize, perfering the user setting to the
// dataset default setting.
function shouldNormalize(vizSettings, defaultNormalization) {
	var user = _.getIn(vizSettings, ['colNormalization']);
	return user === 'subset' || user == null && defaultNormalization;
}

// Returns 2d array of numbers, probes X samples.
// [[number, ...], [number, ...]]
// Performs sorting and normalization.
function computeHeatmap(vizSettings, data, fields, samples, defaultNormalization) {
	if (!data) {
		return [];
	}
	var {mean, probes, values} = data,
		colnormalization = shouldNormalize(vizSettings, defaultNormalization),
		transform = (colnormalization && mean && _.partial(subbykey, mean)) || second;

	return map(probes || fields, function (p, i) {
		var suTrans = saveMissing(v => transform(i, v));
		return map(samples, s => suTrans(_.getIn(values, [i, s])));
	});
}

var flopIfNegStrand = (strand, req) =>
	strand === '-' ?
		_.assoc(req,
				'position', _.reverse(req.position),
				'probes', _.reverse(req.probes),
				'values', _.reverse(req.values)) :
		req;

var colorCodeMap = (codes, colors) =>
	colors ? _.map(codes, c => colors[c] || greyHEX) : null;

var getCustomColor = (fieldSpecs, fields, datasets) =>
	(fieldSpecs.length === 1 && fields.length === 1) ?
		_.getIn(datasets, [fieldSpecs[0].dsID, 'customcolor', fieldSpecs[0].fields[0]], null) : null;

var getAssembly = (fieldSpecs, fields, datasets) => {
	var all = fieldSpecs.map(fs => _.getIn(datasets, [fs.dsID, 'probemapMeta', 'assembly']));
	return _.uniq(all).length === 1 ? all[0] : null;
};

function dataToHeatmap(column, vizSettings, data, samples, datasets) {
	if (!_.get(data, 'req')) {
		return null;
	}
	var {req, codes = {}} = data,
		fields = _.get(req, 'probes', column.fields),
		heatmap = computeHeatmap(vizSettings, req, fields, samples, column.defaultNormalization),
		customColors = colorCodeMap(codes, getCustomColor(column.fieldSpecs, fields, datasets)),
		assembly = getAssembly(column.fieldSpecs, fields, datasets),
		colors = map(fields, (p, i) =>
					 heatmapColors.colorSpec(column, vizSettings, codes, heatmap[i], customColors)),
		units = _.map(column.fieldSpecs, ({dsID}) => _.getIn(datasets, [dsID, 'unit']));

	return {fields, heatmap, assembly, colors, units};
}

//
// sort
//

var {cmpNumberOrNull} = _;

function cmpSamples(probes, data, s1, s2) {
	var diff = data && find(data, function (f) {
			return cmpNumberOrNull(f[s1], f[s2]);
		});
	if (diff) {
		return cmpNumberOrNull(diff[s1], diff[s2]);
	} else {
		return 0;
	}
}

var cmp = ({fields}, {req: {values, probes} = {values, probes}}) =>
	(s1, s2) => cmpSamples(probes || fields, values, s1, s2); // XXX having probes here is unfortunate.

//
// data fetches
//

// Convert nanstr and compute mean.
function meanNanResponse(probes, data) {
	var values = _.map(data, field => _.map(field, xenaQuery.nanstr)),
		mean = _.map(data, _.meannull);

	return {values, mean};
}

function indexProbeGeneResponse(data) {
	var [{name, position}, vals] = data;
	return _.extend({probes: name, position}, meanNanResponse(name, vals));
}

function fillNulls(samples, data) {
	return _.map(data, geneData =>
		geneData.length === 0 ?
			_.times(samples.length, _.constant(null)) : geneData);
}

function orderByQuery(genes, data) {
	var indx = _.invert(_.pluck(data, 'gene'));
	return _.map(genes, function (g) {
		var i = indx[g];
		return i && data[i].scores[0]; // XXX extra level of array in g.SCORES??
	});
}

function probeSpan({position}) {
	return position.length > 0 ? {
		chromend: _.max(_.pluck(position, 'chromend')),
		chromstart: _.min(_.pluck(position, 'chromstart')),
		strand: position[0].strand,
		chrom: position[0].chrom
	} : null;
}

function indexGeneResponse(samples, genes, data) {
	return {
		position: data.map(probeSpan),
		...meanNanResponse(genes, fillNulls(samples, orderByQuery(genes, data)))
	};
}

function indexFieldResponse(fields, resp) {
	var [position, data] = resp;
	return {
		position,
		...meanNanResponse(fields, data)
	};
}

var fetch = ({dsID, fields}, [samples]) => datasetProbeValues(dsID, samples, fields)
	.map(resp => ({req: indexFieldResponse(fields, resp)}));

var fetchGeneProbes = ({dsID, fields, strand}, [samples]) => datasetGeneProbesValues(dsID, samples, fields)
	.map(resp => ({req: flopIfNegStrand(strand, indexProbeGeneResponse(resp))}));

// This should really be fetchCoded. Further, it should only return a single
// code list, i.e. either a single clinical coded field, or a list of genomic
// fields all with the same code values.
var fetchFeature = ({dsID, fields}, [samples]) => Rx.Observable.zipArray(
		datasetProbeValues(dsID, samples, fields)
			.map(resp => indexFieldResponse(fields, resp)),
		fieldCodes(dsID, fields)
	).map(([req, codes]) => ({req, codes: _.values(codes)[0]}));

var fetchGene = ({dsID, fields}, [samples]) => datasetGeneProbeAvg(dsID, samples, fields)
			.map(resp => ({req: indexGeneResponse(samples, fields, resp)}));

////////////////////////////////
// download of on-screen data

function tsvProbeMatrix(heatmap, samples, fields, codes) {
	var fieldNames = ['sample'].concat(fields);
	var coded = _.map(fields, (f, i) => codes ?
			_.map(heatmap[i], _.propertyOf(codes)) :
			heatmap[i]);
	var transposed = _.zip.apply(null, coded);
	var tsvData = _.map(samples, (sample, i) => [sample].concat(transposed[i]));

	return [fieldNames, tsvData];
}

function download({column, data, samples, sampleFormat}) {
	var {fields, heatmap} = column,
		tsvSamples = _.map(samples, sampleFormat);
	return tsvProbeMatrix(heatmap, tsvSamples, fields, data.codes);
}

['probes', 'geneProbes', 'genes', 'clinical'].forEach(fieldType => {
	widgets.transform.add(fieldType, dataToHeatmap);
	widgets.cmp.add(fieldType, cmp);
	widgets.download.add(fieldType, download);
});

module.exports = {
	fetch,
	fetchGeneProbes,
	fetchGene,
	fetchFeature,
	shouldNormalize
};
