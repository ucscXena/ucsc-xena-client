
// Domain logic for segmented datasets.

var _ = require('../underscore_ext').default;
var widgets = require('../columnWidgets');
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx').default;
var exonLayout = require('../exonLayout');
var intervalTree = require('static-interval-tree');
var {pxTransformInterval} = require('../layoutPlot');
import * as heatmapColors from '../heatmapColors';
var parsePos = require('../parsePos');
import sortOrder from './sparseSortOrder';
var {fastats} = require('../xenaWasm');

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
		(s1, s2) => _.cmpNumber(values[s1], values[s2]) :
		() => 0;
}

var {segmentedDataRange, refGeneRange} = xenaQuery;

//

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

function fetchChrom({dsID, assembly}, samples, pos) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return refGeneRange(host, name, pos.chrom, pos.baseStart, pos.baseEnd)
		.flatMap(refGene =>
			segmentedDataRange(dsID, samples, pos.chrom, pos.baseStart, pos.baseEnd)
				.map(req => mapSamples(samples, {req, refGene})));
}

function fetchGene({dsID, fields, assembly}, samples) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return name ? xenaQuery.refGeneExons(host, name, fields)
		.flatMap(refGene => {
			var coords = _.values(refGene)[0];
			if (!coords) {
				return Rx.Observable.of(null, Rx.Scheduler.asap);
			}
			var {txStart, txEnd, chrom} = coords,
				{padTxStart, padTxEnd} = exonPadding;
			return segmentedDataRange(dsID, samples, chrom, txStart - padTxStart, txEnd + padTxEnd)
				.map(req => mapSamples(samples, {req, refGene}));
		}) : Rx.Observable.of(null, Rx.Scheduler.asap);
}

function fetch(column, cohortSamples) {
	var pos = parsePos(column.fields[0]),
		method = pos ? fetchChrom : fetchGene;
	return method(column, cohortSamples, pos);
}


function findNodes(byPosition, layout, samples) {
	var sindex = _.object(samples, _.range(samples.length)),
		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e];

	// _.uniq is something like O(n^2). Using ES6 Set, which should be more like O(n).
	var matches = new Set(_.flatmap(layout.chrom,
				([start, end]) => intervalTree.matches(byPosition, {start, end})));

	return Array.from(_.iterable.map(matches, v => {
		var [xStart, xEnd] = minSize(pxTransformInterval(layout, [v.start, v.end]));
		return {
			xStart,
			xEnd,
			y: sindex[v.segment.sample],
			value: v.segment.value,
			data: v.segment
		};
	}));
}
var swapIf = (strand, [x, y]) => strand === '-' ? [y, x] : [x, y];

function defaultXZoom(pos, refGene) {
	if (pos) { // User supplied chrom position
		return {
			start: pos.baseStart,
			end: pos.baseEnd
		};
	}
	var {txStart, txEnd, strand} = refGene,
		{padTxStart, padTxEnd} = exonPadding,
		[startPad, endPad] = swapIf(strand, [padTxStart, padTxEnd]);

	return {
		start: txStart - startPad,
		end: txEnd + endPad
	};
}

function dataToDisplay(column, vizSettings, data, sortedSamples, index) {
	var pos = parsePos(column.fields[0]);
	if (_.isEmpty(data) || _.isEmpty(data.req) || (!pos && _.isEmpty(data.refGene))) {
		return {
			color: ['no-data']
		};
	}
	var refGeneObj = _.values(data.refGene)[0],
		maxXZoom = defaultXZoom(pos, refGeneObj), // exported for zoom controls
		{dataset, width, showIntrons = false, xzoom = maxXZoom} = column,
		createLayout = pos ? exonLayout.chromLayout : (showIntrons ? exonLayout.intronLayout : exonLayout.layout),
		layout = createLayout(refGeneObj, width, xzoom, pos),
		nodes = findNodes(index.byPosition, layout, sortedSamples),
		color = heatmapColors.colorSpec(column, vizSettings, null, _.getIn(data, ['avg', 'geneValues', 0])),
		units = [_.get(dataset, 'unit')];

	return {
		layout,
		nodes,
		maxXZoom,
		color,
		units
	};
}

function index(fieldType, data) {
	if (!_.get(data, 'req')) {
		return {bySample: {}};
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
	return rows ? _.map(rows, r => _.updateIn(r, ['sample'], sampleFormat)) : rows;
}

var NaNtoNull  = arr => arr.map(v => isNaN(v) ? null : v);

function download({column, data, samples, sampleFormat}) {
	let geneAverages = NaNtoNull(_.getIn(data, ['avg', 'geneValues', 0])),
		columnLabel =  column.user.fieldLabel || column.fieldLabel;

	return [['sample', `${columnLabel} (average)`],
		_.map(samples, sample => [sampleFormat(sample), geneAverages[sample]])];
}

function downloadOneSampleOneRow({data: {req: {rows}}, samples, index, sampleFormat}) {
	let groupedSamples = _.getIn(index, ['bySample']) || [],
		rowFields = getRowFields(rows, groupedSamples),
		allRows = _.map(samples, (sId) => {
			let alternateRow = {sample: sampleFormat(sId)}; // only used for mutation-less samples
			return makeRow(rowFields, formatSamples(sampleFormat, groupedSamples[sId]),
				alternateRow);
		});
	return {
		type: "txt",
		downloadData: [rowFields, allRows]
	};
}

var avgOrNaN = (rows, xzoom, zero) => rows ? (_.isEmpty(rows) ? zero : segmentAverage(rows, xzoom)) : NaN;

function avgSegWithZoom(count, samplesInResp, zero, byPosition, zoom) {
	var matches = _.pluck(intervalTree.matches(byPosition, zoom), 'segment'),
		perSamp = _.groupBy(matches, 'sample'),
		perSamplesInResp = _.object(samplesInResp, samplesInResp.map(i => perSamp[i] || []));

	return _.times(count, i => avgOrNaN(perSamplesInResp[i], zoom, zero));
}

function chromLimits(pos) {
	return {
		start: pos.baseStart,
		end: pos.baseEnd,
	};
}

function geneLimits(refGene) {
	var gene = _.values(refGene)[0];
	return {
		start: gene.txStart,
		end: gene.txEnd
	};
}

// Average segments, clipping to zoom or the gene boundaries, whichever is smaller.
function averageSegments(column, data, count, index) {
	var pos = parsePos(column.fields[0]);
	if (!_.get(data, 'req') || !(pos || _.values(data.refGene).length)) {
		return null;
	}
	var limits = pos ? chromLimits(pos) : geneLimits(data.refGene),
		xzoom = {
			start: max(limits.start, _.getIn(column, ['xzoom', 'start'], -Infinity)),
			end: min(limits.end, _.getIn(column, ['xzoom', 'end'], Infinity))
		},
		samplesInResp = _.getIn(data, ['req', 'samplesInResp']),
		zeroOrigin = _.getIn(column, ['vizSettings', 'origin'], undefined),
		norm = _.getIn(column, ['vizSettings', 'colNormalization']),
		zeroNorm = norm === 'normal2' ? 2 : norm === 'none' ? 0 : undefined,
		defaultNorm = _.getIn(column, ['defaultNormalization']),
		zeroDefaultNorm = defaultNorm === 'normal2' ? 2 : defaultNorm === 'none' ? 0 : undefined,
		zero = zeroOrigin !== undefined ? zeroOrigin :
			zeroNorm !== undefined ? zeroNorm :
			zeroDefaultNorm !== undefined ? zeroDefaultNorm : 0,
		values = [avgSegWithZoom(count, samplesInResp, zero, index.byPosition, xzoom)],
		geneValues = [avgSegWithZoom(count, samplesInResp, zero, index.byPosition, {start: limits.start, end: limits.end})],
		mm = geneValues.map(fastats);

	return {
		avg: {
			values,
			// re-calculating this isn't really necessary. We could move it earlier, like in the 'index'
			// selector, since it doesn't depend on zoom.
			geneValues,
			mean: _.pluck(mm, 'mean'),
			median: _.pluck(mm, 'median'),
			min: _.pluck(mm, 'min'),
			max: _.pluck(mm, 'max'),
			sd: _.pluck(mm, 'sd'),
			p01: _.pluck(mm, 'p01'),
			p99: _.pluck(mm, 'p99'),
			p05: _.pluck(mm, 'p05'),
			p95: _.pluck(mm, 'p95'),
			p10: _.pluck(mm, 'p10'),
			p90: _.pluck(mm, 'p90'),
			p25: _.pluck(mm, 'p25'),
			p75: _.pluck(mm, 'p75'),
			p33: _.pluck(mm, 'p33'),
			p66: _.pluck(mm, 'p66'),
		}
	};
}

widgets.cmp.add('segmented', cmp);
widgets.index.add('segmented', index);
widgets.data.add('segmented', sortOrder(cmp));
widgets.transform.add('segmented', dataToDisplay);
widgets.avg.add('segmented', averageSegments);
widgets.download.add('segmented', download);
widgets.specialDownload.add('segmented', downloadOneSampleOneRow);

module.exports = {
	fetch
};
