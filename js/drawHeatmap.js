/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var partition = require('./partition');
var colorScales = require('./colorScales');

var colorFns = vs => _.map(vs, colorScales.colorScale);

var drawBackground = (vg, width, height) => vg.box(0, 0, width, height, "gray");

var labelFont = 12;
var labelMargin = 1; // left & right margin

var secondExists = x => x[1] != null;

var each = _.each,
	map = _.map,
	filter = _.filter,
	zip = _.zip,
	range = _.range;

function drawColumn(data, colorScale, boxfn) {
	var colors;

	if (colorScale) { // then there exist some non-null values
		// zip colors and their indexes, then filter out the nulls
		colors = filter(zip(range(data.length), map(data, colorScale)), secondExists);
		each(colors, args => boxfn(...args));
	}
}

// Writing this optimized because it's expensive when
// zoomed out on a large cohort.
function findContiguous(arr, min) {
	var start, end = 0, length = arr.length, res = [], clen;
	while (end < length) {
		start = end;
		while (end < length && arr[start] === arr[end]) {
			++end;
		}
		clen = end - start;
		if (clen > min) {
			res.push([start, clen]);
		}
	}
	return res;
}

function codeLabels(codes, rowData, minSpan) {
	 var groups = findContiguous(rowData, minSpan);
	 return _.map(groups, ([start, len]) =>
			 [_.get(codes, rowData[start], null), start, len]);
}

function floatLabels(rowData, minSpan) {
	var nnLabels = minSpan <= 1 ?
			_.filter(_.map(rowData, (v, i) => {
 				return (v % 1) ? [v.toPrecision([3]), i, 1] : [v, i, 1]; // display float with 3 significant digit, integer no change
 			}), ([v]) => v !== null) : [],
		nullLabels = _.filter(_.map(findContiguous(rowData, minSpan), ([start, len]) => [rowData[start], start, len]),
				([v]) => v === null);
	return [...nnLabels, ...nullLabels];
}

function drawLayout(vg, opts) {
	var {height, width, index, count, layout, data, codes, colors} = opts,
		minTxtWidth = vg.textWidth(labelFont, 'WWWW'),
		first = Math.floor(index),
		last  = Math.ceil(index + count);

	vg.smoothing(false); // For some reason this works better if we do it every time.

	// reset image
	if (data.length === 0) { // no features to draw
		vg.box(0, 0, width, height, "gray");
		return;
	}

	each(layout, function (el, i) {
		var rowData = data[i].slice(first, last),
			colorScale = colors[i],
			drawRow = (vg, rwidth, rheight) =>
				drawColumn(rowData, colorScale, (i, color) =>
					vg.box(0, i * rheight, rwidth, rheight, color));


		vg.translate(el.start, 0, () =>
			vg.drawSharpRows(vg, index, count, height, el.size,
				drawBackground,
				drawRow));

		// Add labels
		var minSpan = labelFont / (height / count);
		if (el.size - 2 * labelMargin >= minTxtWidth) {
			let labels = codes ? codeLabels(codes, rowData, minSpan) : floatLabels(rowData, minSpan),
				h = height / count;
			vg.clip(el.start + labelMargin, 0, el.size - labelMargin, height, () =>
					labels.forEach(([l, i, ih]) => // label, index, count
						vg.textCenteredPushRight(el.start + labelMargin, h * i - 1, el.size - labelMargin,
												 h * ih, 'black', labelFont, l)));
		}
	});
}

function drawHeatmap(vg, props) {
	var {heatmapData = [], codes, colors, width,
		zoom: {index, count, height}} = props;

	drawLayout(vg, {
		height,
		width,
		index,
		count,
		data: heatmapData,
		codes,
		layout: partition.offsets(width, 0, heatmapData.length),
		colors: colorFns(colors)
	});
}

module.exports = drawHeatmap;
