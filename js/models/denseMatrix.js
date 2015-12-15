/*global require: false, document: false */
'use strict';
var _ = require('underscore_ext');
var Rx = require('rx');
var {map, find} = _;
var xenaQuery = require('xenaQuery');
var heatmapColors = require('heatmapColors');
var widgets = require('columnWidgets');

// XXX might want to automatically wrap all of these in xenaQuery.
var datasetProbeValues = xenaQuery.dsID_fn(xenaQuery.dataset_probe_values);
var datasetGenesValues = xenaQuery.dsID_fn(xenaQuery.dataset_genes_values);
var datasetGeneProbesValues = xenaQuery.dsID_fn(xenaQuery.dataset_gene_probe_values);
var datasetFeatureDetail = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
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
function shouldNormalize(vizSettings, dataset) {
	var user = _.getIn(vizSettings, ['colNormalization']),
		dataDefault = _.getIn(dataset, ['colnormalization']);
	return user === 'subset' || user == null && dataDefault;
}

// Returns 2d array of numbers, probes X samples.
// [[number, ...], [number, ...]]
// Performs sorting and normalization.
function computeHeatmap(vizSettings, data, fields, samples, dataset) {
	if (!data) {
		return [];
	}
	var {mean, probes, values} = data,
		colnormalization = shouldNormalize(vizSettings, dataset),
		transform = (colnormalization && mean && _.partial(subbykey, mean)) || second;

	return map(probes || fields, function (p) {
		var suTrans = saveMissing(v => transform(p, v));
		return map(samples, s => suTrans(_.getIn(values[p], [s])));
	});
}

function dataToHeatmap(column, vizSettings, {req, codes = {}}, samples, dataset) {
	var fields = req.probes || column.fields;
	var heatmap = computeHeatmap(vizSettings, req, fields, samples, dataset),
		colors = map(fields, (p, i) =>
					 heatmapColors.colorSpec(column, vizSettings,
											 codes[p], heatmap[i], dataset));
	return {heatmap: heatmap, colors: colors};
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
	var diff = data && find(probes, function (f) {
			return data[f] && cmpNumberOrNull(data[f][s1], data[f][s2]);
		});
	if (diff) {
		return cmpNumberOrNull(data[diff][s1], data[diff][s2]);
	} else {
		return 0;
	}
}

var cmp = ({fields}, {req: {values, probes}}) =>
	(s1, s2) => cmpSamples(probes || fields, values, s1, s2);

//
// data fetches
//

// index data by field, then sample
// XXX maybe build indexes against arrays, instead of ditching the arrays,
// so we can do on-the-fly stuff, like average, km, against an array.
function indexResponse(probes, samples, data) {
	var values = _.object(probes, _.map(probes, function (v, i) {
			return _.object(samples, _.map(data[i], xenaQuery.nanstr));
		})),
		mean = _.object(probes, _.map(data, _.meannan));

	return {values: values, mean: mean};
}

// XXX A better approach might be to update the other index* functions
// such that they always create the "probes" in the request.
//
// Currently for every other request there's a 1-1 correspondence between
// requested "fields" and the fields returned by the server, so we just
// use column.fields to drive the layout and sort. This query is different
// in that we request one thing (gene) and get back a list of things (probes
// in the gene). So we can't base layout and sort on column.fields. We instead
// put the field list into data.req.probes, in this function, and add complexity
// to render() and cmp() such that they prefer data.req.probes to column.fields.
// The alternative is to always create data.req.probes.
function indexProbeGeneResponse(samples, data) {
	var probes = data[0],
		vals = data[1];
	return _.extend({probes: probes}, indexResponse(probes, samples, vals));
}

function orderByQuery(genes, data) {
	var indx = _.invert(_.pluck(data, 'gene'));
	return _.map(genes, function (g) {
		var i = indx[g];
		return i && data[i].scores[0]; // XXX extra level of array in g.SCORES??
	});
}

function indexGeneResponse(genes, samples, data) {
	return indexResponse(genes, samples, orderByQuery(genes, data));
}

var fetch = ({dsID, fields}, samples) => datasetProbeValues(dsID, samples, fields)
	.map(resp => ({req: indexResponse(fields, samples, resp)}));

var fetchGeneProbes = ({dsID, fields}, samples) => datasetGeneProbesValues(dsID, samples, fields)
	.map(resp => ({req: indexProbeGeneResponse(samples, resp)}));

var fetchFeature = ({dsID, fields}, samples) => Rx.Observable.zipArray(
		datasetProbeValues(dsID, samples, fields)
			.map(resp => indexResponse(fields, samples, resp)),
		datasetFeatureDetail(dsID, fields),
		datasetCodes(dsID, fields)
	).map(resp => _.object(['req', 'features', 'codes'], resp));


var fetchGene = ({dsID, fields}, samples) => datasetGenesValues(dsID, samples, fields)
			.map(resp => ({req: indexGeneResponse(fields, samples, resp)}));

widgets.cmp.add("probeMatrix", cmp);
widgets.fetch.add("probeMatrix", fetch);
widgets.transform.add("probeMatrix", dataToHeatmap);

widgets.cmp.add("geneProbesMatrix", cmp);
widgets.fetch.add("geneProbesMatrix", fetchGeneProbes);
widgets.transform.add("geneProbesMatrix", dataToHeatmap);

widgets.cmp.add("geneMatrix", cmp);
widgets.fetch.add("geneMatrix", fetchGene);
widgets.transform.add("geneMatrix", dataToHeatmap);

widgets.cmp.add("clinicalMatrix", cmp);
widgets.fetch.add("clinicalMatrix", fetchFeature);
widgets.transform.add("clinicalMatrix", dataToHeatmap);
