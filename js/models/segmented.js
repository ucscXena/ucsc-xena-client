/*global require: false, module: false */
'use strict';

// Domain logic for segmented datasets.

var _ = require('../underscore_ext');
var widgets = require('../columnWidgets');
var xenaQuery = require('../xenaQuery');
var Rx = require('rx');
var exonLayout = require('../exonLayout');
var intervalTree = require('static-interval-tree');
var {pxTransformInterval} = require('../layoutPlot');
var heatmapColors = require('../heatmapColors');

function groupedLegend(colorMap, valsInData) { //eslint-disable-line no-unused-vars
	var inData = new Set(valsInData),
		groups = _.groupBy(
			_.filter(_.keys(colorMap), val => inData.has(val)), k => colorMap[k]),
		colors = _.keys(groups);
	return {
		colors,
		labels: _.map(colors, c => groups[c].join(', ')),
		align: 'left'
	};
}

var exonPadding = {
	padTxStart: 3000,
	padTxEnd: 1000
};

var min = (x, y) => x < y ? x : y;
var max = (x, y) => x > y ? x : y;

// sum(len * value)/sum(len)
//
function segmentAverage(row, {start, end}) {
	var lengths = row.map(seg => min(seg.end, end) - max(seg.start, start) + 1),
		totalLen = _.sum(lengths),
		weightedSum = _.sum(row.map((seg, i) => seg.value * lengths[i]));
	return weightedSum / totalLen;
}

function cmp(column, data) {
	var sortVisible = _.get(column, 'sortVisible', true),
		values = _.getIn(data, ['avg', sortVisible ? 'values' : 'geneValues', 0]);

	return values ?
		(s1, s2) => _.cmpNumberOrNull(values[s1], values[s2]) :
		() => 0;
}

var {segmentedDataRange} = xenaQuery;

// XXX Might want to optimize this before committing. We could mutate in-place
// without affecting anyone. This may be slow for large mutation datasets.
//
// Map sampleIDs to index into 'samples' array.
function mapSamples(samples, data) {
	var sampleMap = _.object(samples, _.range(samples.length));

	return _.updateIn(data,
		   ['req', 'rows'], rows => _.map(rows,
			   row => _.assoc(row, 'sample', sampleMap[row.sample])),
		   ['req', 'samplesInResp'], sIR => _.map(sIR, s => sampleMap[s]));
}

function fetch({dsID, fields, assembly}, [samples]) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return name ? xenaQuery.refGeneExonCase(host, name, fields)
		.flatMap(refGene => {
			var {txStart, txEnd, chrom} = _.values(refGene)[0],
				{padTxStart, padTxEnd} = exonPadding;
			return segmentedDataRange(dsID, samples, chrom, txStart - padTxStart, txEnd + padTxEnd)
				.map(req => mapSamples(samples, {req, refGene}));
		}) : Rx.Observable.return(null);
}

function findNodes(byPosition, layout, samples) {
	var sindex = _.object(samples, _.range(samples.length)),
		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e];

	// _.uniq is something like O(n^2). Using ES6 Set, which should be more like O(n).
	var matches = new Set(_.flatmap(layout.chrom,
				([start, end]) => intervalTree.matches(byPosition, {start, end})));

	return [...matches].map(v => {
		var [xStart, xEnd] = minSize(pxTransformInterval(layout, [v.start, v.end]));
		return {
			xStart,
			xEnd,
			y: sindex[v.segment.sample],
			value: v.segment.value,
			data: v.segment
		};
	});
}

var swapIf = (strand, [x, y]) => strand === '-' ? [y, x] : [x, y];

function defaultXZoom(refGene) {
	var {txStart, txEnd, strand} = refGene,
		{padTxStart, padTxEnd} = exonPadding,
		[startPad, endPad] = swapIf(strand, [padTxStart, padTxEnd]);

	return {
		start: txStart - startPad,
		end: txEnd + endPad
	};
}

function dataToDisplay(column, vizSettings, data, sortedSamples, datasets, index) {
	if (_.isEmpty(data) || _.isEmpty(data.req)) {
		return {};
	}
	var {refGene} = data,
		refGeneObj = _.values(refGene)[0],
		maxXZoom = defaultXZoom(refGeneObj),
		{width, showIntrons = false, xzoom = maxXZoom} = column,
		createLayout = showIntrons ? exonLayout.intronLayout : exonLayout.layout,
		layout = createLayout(refGeneObj, width, xzoom),
		nodes = findNodes(index.byPosition, layout, sortedSamples),
		//color = heatmapColors.colorSpec(column, vizSettings, null, _.pluck(data.req.rows, 'value')),
		color = heatmapColors.colorSpec(column, vizSettings, null, _.getIn(data, ['avg', 'geneValues', 0])),
		units = _.map(column.fieldSpecs, ({dsID}) => _.getIn(datasets, [dsID, 'unit']));

	return {
		layout,
		nodes,
		maxXZoom,
		color,
		units
	};
}

function index(fieldType, data) {
	if (!_.get(data, 'req') || _.values(data.refGene).length === 0) {
		return null;
	}

	var {req: {rows, samplesInResp}} = data,
		bySample = _.groupBy(rows, 'sample'),
		empty = []; // use a single empty object.

	rows = rows.map(row => {
		var {start, end} = row;

		return {
			start: start,
			end: end,
			segment: row
		};
	});

	return {
		byPosition: intervalTree.index(rows),
		bySample: _.object(
				samplesInResp,
				samplesInResp.map(s => bySample[s] || empty))
	};
}

///////////////////////////////////
// download

function makeRow(fields, sampleGroup, row) {
	let fieldValue;
	if (_.isArray(sampleGroup) && sampleGroup.length === 0) {
		fieldValue = 'no variant';
	}
	if (_.isEmpty(sampleGroup)) {
		sampleGroup = [row];
	}
	return _.flatmap(sampleGroup, row =>
		_.map(fields, f => (row && row[f]) || fieldValue));
}

function getRowFields(rows, sampleGroups) {
	if (_.isEmpty(sampleGroups)) {
		return []; // When no samples exist
	} else if (!_.isEmpty(rows)) {
		return _.keys(rows[0]); // When samples have mutation(s)
	} else {
		return ['sample', 'result']; // default fields for mutation-less columns
	}
}

function formatSamples(sampleFormat, rows) {
	return _.map(rows, r => _.updateIn(r, ['sample'], sampleFormat));
}

function download({data: {req: {rows}}, samples, index, sampleFormat}) {
	let groupedSamples = _.getIn(index, ['bySample']) || [],
		rowFields = getRowFields(rows, groupedSamples),
		allRows = _.map(samples, (sId) => {
			let alternateRow = {sample: sampleFormat(sId)}; // only used for mutation-less samples
			return makeRow(rowFields, formatSamples(sampleFormat, groupedSamples[sId]),
				alternateRow);
		});
	return [rowFields, allRows];
}

var avgOrNull = (rows, xzoom) => _.isEmpty(rows) ? null : segmentAverage(rows, xzoom);

function avgSegWithZoom(samples, byPosition, zoom) {
	var matches = _.pluck(intervalTree.matches(byPosition, zoom), 'segment'),
		perSamp = _.groupBy(matches, 'sample');
	return _.map(samples, s => avgOrNull(perSamp[s], zoom));
}

// Average segments, clipping to zoom or the gene boundaries, whichever is smaller.
function averageSegments(column, data, samples, index) {
	if (!_.get(data, 'req') || _.values(data.refGene).length === 0) {
		return null;
	}
	var gene = _.values(data.refGene)[0],
		xzoom = {
			start: max(gene.txStart, _.getIn(column, ['xzoom', 'start'], -Infinity)),
			end: min(gene.txEnd, _.getIn(column, ['xzoom', 'end'], Infinity))
		},
		values = [avgSegWithZoom(samples, index.byPosition, xzoom)],
		geneValues = [avgSegWithZoom(samples, index.byPosition, {start: gene.txStart, end: gene.txEnd})];

	return {
		avg: {
			values,
			// re-calculating this isn't really necessary. We could move it earlier, like in the 'index'
			// selector, since it doesn't depend on zoom.
			geneValues
			// XXX do we need the mean? Only for a normalized view. Are we doing that?
//			mean: values.map(_.meannull)
		}
	};
}

widgets.cmp.add('segmented', cmp);
widgets.index.add('segmented', index);
widgets.transform.add('segmented', dataToDisplay);
widgets.avg.add('segmented', averageSegments);
widgets.download.add('segmented', download);

module.exports = {
	averageSegments,
	segmentAverage,
	defaultXZoom,
	fetch
};
