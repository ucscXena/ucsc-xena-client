/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var colorScales = require('./colorScales');

var labelFont = 12;
//var labelMargin = 1; // left & right margin

var radius = 4;
var minVariantHeight = pixPerRow => Math.max(pixPerRow, 2); // minimum draw height of 2

var toYPx = (zoom, v) => {
	var {height, count, index} = zoom,
		svHeight = height / count;
	return  {svHeight, y: (v.y - index) * svHeight + (svHeight / 2)};
};

function push(arr, v) {
	arr.push(v);
	return arr;
}

// A recursive implementation might be clearer.
var backgroundStripes = hasValue =>
	_.reduce(
		_.groupByConsec(hasValue, _.identity),
		([acc, sum], g) =>
			[g[0] ? acc : push(acc, [sum, g.length]), sum + g.length],
		[[], 0])[0];

function drawBackground(vg, width, height) {
	vg.smoothing(false);
	vg.box(0, 0, width, height, 'grey'); // white background
}

function labelNulls(vg, width, height, count, stripes) {
	var pixPerRow = height / count,
		nullLabels = stripes.filter(([, len]) => len * pixPerRow > labelFont);

	nullLabels.forEach(([offset, len]) => {
		vg.textCenteredPushRight(0, pixPerRow * offset, width, pixPerRow * len, 'black', labelFont, "null");
	});
}

function drawSegments(vg, colorScale, width, rheight, zoom, segments) {

	var toDraw = _.map(segments, v => {
		var y = (v.y - zoom.index) * rheight + (rheight / 2);
		return {
			...v,
			y,
			h: rheight,
			color: colorScale(v.value)
		};
	});

	_.each(toDraw, segment => {
		var {xStart, xEnd, y, h, color} = segment,
			points = [[xStart, y, xEnd, y]];

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: h});
	});
}

var drawSegmented = _.curry((vg, props) => {
	let {width, zoom, nodes, color} = props,
		{count, height, index} = zoom;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let colorScale = colorScales.colorScale(color),
		{samples, index: {bySample: samplesInDS}} = props,
		last = index + count,
		toDraw = nodes.filter(v => v.y >= index && v.y < last),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]),
		stripes = backgroundStripes(hasValue);

	vg.drawSharpRows(vg, index, count, height, width,
		drawBackground,
		(vg, rwidth, rheight) =>
			drawSegments(vg, colorScale, rwidth, rheight, zoom, toDraw));
	labelNulls(vg, width, height, count, stripes);
});

module.exports = {drawSegmented, radius, minVariantHeight, toYPx, labelFont};
