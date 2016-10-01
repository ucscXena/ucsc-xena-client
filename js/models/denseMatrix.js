/*global require: false, module: false */
'use strict';
var _ = require('../underscore_ext');
var Rx = require('rx');
var {map, find} = _;
var xenaQuery = require('../xenaQuery');
var heatmapColors = require('../heatmapColors');
var widgets = require('../columnWidgets');

// XXX might want to automatically wrap all of these in xenaQuery.
var datasetProbeValues = xenaQuery.dsID_fn(xenaQuery.dataset_probe_values);
var datasetGenesValues = xenaQuery.dsID_fn(xenaQuery.dataset_genes_values);
var datasetGeneProbesValues = xenaQuery.dsID_fn(xenaQuery.dataset_gene_probe_values);
var datasetCodes = xenaQuery.dsID_fn(xenaQuery.code_list);


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
				'probes', _.reverse(req.probes),
				'values', _.reverse(req.values)) :
		req;

function dataToHeatmap(column, vizSettings, data, samples) {
	if (!_.get(data, 'req')) {
		return null;
	}
	var {req, codes = {}} = data,
		fields = _.get(req, 'probes', column.fields),
		heatmap = computeHeatmap(vizSettings, req, fields, samples, column.defaultNormalization),
		colors = map(fields, (p, i) =>
					 heatmapColors.colorSpec(column, vizSettings, codes, heatmap[i]));
	return {fields, heatmap, colors};
}

//
// sort
//

function cmpNumberOrNull(v1, v2) {
	if (v1 == null && v2 == null) {
		return 0;
	} else if (v1 == null) {
		return 1;
	} else if (v2 == null) {
		return -1;
	}
	return v2 - v1;
}

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
	var probes = data[0],
		vals = data[1];
	return _.extend({probes: probes}, meanNanResponse(probes, vals));
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

function indexGeneResponse(samples, genes, data) {
	return meanNanResponse(genes, fillNulls(samples, orderByQuery(genes, data)));
}

var fetch = ({dsID, fields}, [samples]) => datasetProbeValues(dsID, samples, fields)
	.map(resp => ({req: meanNanResponse(fields, resp)}));

var fetchGeneProbes = ({dsID, fields, strand}, [samples]) => datasetGeneProbesValues(dsID, samples, fields)
	.map(resp => ({req: flopIfNegStrand(strand, indexProbeGeneResponse(resp))}));

// This should really be fetchCoded. Further, it should only return a single
// code list, i.e. either a single clinical coded field, or a list of genomic
// fields all with the same code values.
var fetchFeature = ({dsID, fields}, [samples]) => Rx.Observable.zipArray(
		datasetProbeValues(dsID, samples, fields)
			.map(resp => meanNanResponse(fields, resp)),
		datasetCodes(dsID, fields)
	).map(([req, codes]) => ({req, codes: _.values(codes)[0]}));

var fetchGene = ({dsID, fields}, [samples]) => datasetGenesValues(dsID, samples, fields)
			.map(resp => ({req: indexGeneResponse(samples, fields, resp)}));

['probes', 'geneProbes', 'genes', 'clinical'].forEach(fieldType => {
	widgets.transform.add(fieldType, dataToHeatmap);
	widgets.cmp.add(fieldType, cmp);
});

module.exports = {
	fetch,
	fetchGeneProbes,
	fetchGene,
	fetchFeature,
	shouldNormalize
};
