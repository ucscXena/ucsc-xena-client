/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var colorScales = require('./colorScales');

var labelFont = 12;
var labelMargin = 1; // left & right margin

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
	vg.box(0, 0, width, height, 'grey'); // grey background
}

function labelNulls(vg, width, height, count, stripes) {
	var pixPerRow = height / count,
		nullLabels = stripes.filter(([, len]) => len * pixPerRow > labelFont);

	nullLabels.forEach(([offset, len]) => {
		vg.textCenteredPushRight(0, pixPerRow * offset, width, pixPerRow * len, 'black', labelFont, "null");
	});
}

function labelValues(vg, width, {index, height, count}, toDraw) {
	var rheight = height / count;
	if (rheight > labelFont) {
		let h = rheight;

		toDraw.forEach(function(v) {
			var {xStart, xEnd, value} = v,
				y = (v.y - index) * rheight + (rheight / 2),
				label = '' + value,
				textWidth = vg.textWidth(labelFont, label);

			if ((xEnd - xStart) >= textWidth) {
				vg.textCenteredPushRight(xStart + labelMargin, y - h / 2, xEnd - xStart - labelMargin,
						h, 'black', labelFont, label);
			}
		});
	}
}

// Convert a color scale to a lookup table, by sampling along its
// domain. This is much faster than doing interpolation on every data
// point.
var maxColors = 200;
function colorTable(colorScale) {
	var domain = colorScale.domain(),
		min = _.min(domain),
		max = _.max(domain),
		len = max - min,
		table = _.range(min, max, len / maxColors).map(colorScale);
	return {
		lookup: v => {
			if (v == null) {
				return 'gray';
			}
			var i = Math.floor((v - min) * maxColors / len),
				clipped = i < 0 ? 0 : (i >= maxColors ? maxColors - 1 : i);
			return table[clipped];
		},
		table
	};
}

// Rearrange an array in order [floor(N/2), floor(N/2) + 1, floor(N/2) - 1, ...]
function reorder(arr) {
	var mid = Math.floor(arr.length / 2), // may round down
		up = arr.slice(mid, arr.length),  // may be longer
		down = arr.slice(0, mid).reverse();
	return _.flatten(_.zip(up, down)).slice(0, arr.length);
}

// There are two optimizations here, for large inputs. This is close to 2x
// faster than w/o the optimizations.
//
// d3 color scales will interpolate each input, then convert to string.
// This is much too slow for large collections. Instead, we sample the
// color scale along its domain to create a table. Then we can
// look up the color string in the table with a simple divide.
//
// After discretizing the color in this fashion, we can group the segments
// by color. This lets us minimize canvas color changes, which are extremely
// expensive. This approach has a drawback: it can obscure small features of
// the data when zoomed out. If red is always drawn after blue, small blue features
// will not show up. If, instead, we draw segments in random order, red-on-blue
// and blue-on-red features will both show up, because on average a few red and
// a few blue will be drawn last. However this is very slow, because of all
// the canvas color changes.
//
// A workaround, here, is to draw the discrete color groups in alternating
// order from the middle to both extremes, via the reorder() function. So
// with default colors we draw white, light red, light blue, darker red, darker blue,
// etc., to each extreme. This shows small feature well in a few representative
// datasets.
//
// It's possible this will work poorly for other datasets, e.g. if there are
// only a few colors. If this is the case, we might instead want to alternate
// subsets of the few color groups.

function drawSegments(vg, colorScale, width, rheight, zoom, segments) {
	var {lookup, table} = colorTable(colorScale),
		toDraw = segments.map(v => {
			var y = (v.y - zoom.index) * rheight + (rheight / 2);
			return {
				points: [v.xStart, y, v.xEnd, y],
				color: lookup(v.value)
			};
		}),
		byColor = _.groupBy(toDraw, 'color');

	['gray', ...reorder(table)].forEach(color => {
		var colorGroup = byColor[color],
		points = _.pluck(colorGroup, 'points');

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: rheight});
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

	if (nodes.length > 0) {
		vg.drawSharpRows(vg, index, count, height, width,
			drawBackground,
			(vg, rwidth, rheight) =>
				drawSegments(vg, colorScale, rwidth, rheight, zoom, toDraw));
	}
	labelNulls(vg, width, height, count, stripes);
	labelValues(vg, width, zoom, toDraw);
});

module.exports = {drawSegmented, radius, minVariantHeight, toYPx, labelFont};
