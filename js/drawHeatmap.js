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
		if (el.size - 2 * labelMargin >= minTxtWidth && height / count > labelFont) {
			let h = height / count;
			vg.clip(el.start + labelMargin, 0, el.size - labelMargin, height, () =>
					rowData.forEach((v, i) =>
						vg.textCenteredPushRight(el.start + labelMargin, h * i - 1, el.size - labelMargin,
												 h, 'black', labelFont, codes ? (codes[v] ? codes[v] : null ) : v )));
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
