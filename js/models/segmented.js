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
	var lengths = row.map(seg => min(seg.end, end) - max(seg.start, start)),
		totalLen = _.sum(lengths),
		weightedSum = _.sum(row.map((seg, i) => seg.value * lengths[i]));
	return weightedSum / totalLen;
}

function rowOrder(row1, row2, xzoom) {
	var avg1 = segmentAverage(row1, xzoom),
		avg2 = segmentAverage(row2, xzoom);

	return avg1 === avg2 ? 0 : (avg1 > avg2 ? -1 : 1);
}

function cmpRowOrNoSegments(r1, r2, xzoom) {
	var rf1 = r1.filter(v => v.start <= xzoom.end && v.end >= xzoom.start),
		rf2 = r2.filter(v => v.start <= xzoom.end && v.end >= xzoom.start);
	if (rf1.length === 0) {
		return (rf2.length === 0) ? 0 : 1;
	}
	return (rf2.length === 0) ? -1 : rowOrder(rf1, rf2, xzoom);
}

function cmpRowOrNull(r1, r2, xzoom) {
	if (r1 == null) {
		return (r2 == null) ? 0 : 1;
	}
	return (r2 == null) ? -1 : cmpRowOrNoSegments(r1, r2, xzoom);
}

function cmpSamples(probes, xzoom, sample, s1, s2) {
	return cmpRowOrNull(sample[s1], sample[s2], xzoom);
}

// XXX Instead of checking strand here, it should be set as a column
// property as part of the user input: flip if user enters a gene on
// negative strand. Don't flip for genomic range view, or positive strand.
function cmp(column, data, index) {
	var {fields, xzoom, sortVisible} = column,
		appliedZoom = sortVisible && xzoom ? xzoom : {start: -Infinity, end: Infinity},
		samples = _.getIn(index, ['bySample']);

	return samples ?
		(s1, s2) => cmpSamples(fields, appliedZoom, samples, s1, s2) :
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
		color = heatmapColors.colorSpec(column, vizSettings, null, _.pluck(data.req.rows, 'value'));

	return {
		layout,
		nodes,
		maxXZoom,
		color
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

widgets.cmp.add('segmented', cmp);
widgets.index.add('segmented', index);
widgets.transform.add('segmented', dataToDisplay);
widgets.download.add('segmented', download);

module.exports = {
	segmentAverage,
	defaultXZoom,
	fetch
};
