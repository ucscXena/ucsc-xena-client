'use strict';

var _ = require('./underscore_ext');
var colorScales = require('./colorScales');
var {rgb, RGBtoHSV, HSVtoRGB} = require('./color_helper');

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
function colorTable(colorScale, asRgb) {
	var domain = colorScale.domain(),
		min = _.min(domain),
		max = _.max(domain),
		len = max - min,
		table = _.range(min, max, len / maxColors).map(colorScale);

	table = asRgb ? table.map(rgb) : table;
	return {
		lookup: v => {
			if (v == null) {
				return asRgb ? [128, 128, 128] : 'gray';
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

function meannullIter(iter) {
	var count = 0, sum = 0, n;
	if (!iter) {
		return null;
	}
	n = iter.next();
	while (!n.done) {
		if (n.value.value != null) {
			count += 1;
			sum += n.value.value;
		}
		n = iter.next();
	}
	if (count > 0) {
		return sum / count;
	}
	return null;
}

// There must be a better way to compute this.
function findRegions(index, height, count) {
	var starts = _.uniq(
			_.map(_.range(count), y => ~~(y * height / count))),
		regions = _.partitionN(starts, 2, 1, [height]),
		lens = regions.map(([s, e]) => e - s);
	return _.object(starts, lens);
}

var byEnd = (x, y) => x.xEnd - y.xEnd;
var byStart = (x, y) => x.xStart - y.xStart;

function drawImgSegments(vg, color, index, count, width, height, zoom, nodes) {
	var colorScale = colorScales.colorScale(color),
		{lookup} = colorTable(colorScale, true),
		ctx = vg.context(),
		img = ctx.createImageData(width, height), // XXX cache & reuse?
		regions = findRegions(index, height, count),
		toPxRow = v => ~~((v.y - index) * height / count), // ~~ for floor
		byRow = _.groupBy(nodes, toPxRow);

	for (let is in byRow) {
		var i = parseInt(is, 10); // Ugh.
		let rowI = byRow[i];

		if (!rowI) {
			continue;
		}
		// Using sort vs. _.sortBy because it's faster.
		let ends = rowI.slice(0).sort(byEnd),
			starts = rowI.slice(0).sort(byStart),
			len = rowI.length,
			scope = new Set(), // XXX is Set slow?
			pxStart = starts[0].xStart,
			pxEnd,
			nextStartNode, nextEndNode,
			j = 0, k = 0, l;

		while(j < len || k < len) {
			while (j < len && starts[j].xStart === pxStart) {
				scope.add(starts[j++]);
			}
			while (k < len && ends[k].xEnd === pxStart + 1) {
				scope.delete(ends[k++]);
			}

			if (k >= len) {
				continue;
			}
			nextStartNode = j < len && starts[j];
			nextEndNode = ends[k];
			if (j < len && nextStartNode.xStart < nextEndNode.xEnd - 1) {
				pxEnd = nextStartNode.xStart + 1;
			} else {
				pxEnd = nextEndNode.xEnd;
			}
			// generators with regenerator seem to be slow, perhaps due to try/catch.
			// So, _.meannull generator version, and _.i methods are limiting.
//			let avg = meannullIter(_.i.map(scope.values(), v => v.value)),
			let avg = meannullIter(scope.values()), // this is much faster than _.i.map
				lastRow = i + regions[i],
				color = lookup(avg);
			for (let r = i; r < lastRow; ++r) {
				let pxRow = r * width,
					buffStart = (pxRow + pxStart) * 4,
					buffEnd = (pxRow + pxEnd) * 4;

				for (l = buffStart; l < buffEnd; l += 4) {
					img.data[l] = color[0];
					img.data[l + 1] = color[1];
					img.data[l + 2] = color[2];
					img.data[l + 3] = 255; // XXX can we set + 3 to 255 globally?
				}
			}
			pxStart = pxEnd - 1;
		}
	}
	ctx.putImageData(img, 0, 0);
}

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);
var rgbToArray = obj => [obj.r, obj.g, obj.b];

// Find the minimum path from h0 to h1 in the hue space, which
// wraps at 1.
function minHueRange(h0, h1) {
	var [low, high] = h0 < h1 ? [h0, h1] : [h1, h0];
	return high - low > low + 1 - high ? [high, low + 1] : [low, high];
}

// Since we're doing pixel math, can we just compute the colors on-the-fly, instead
// of using a table?
var maxHues = 20;
var maxSaturations = 10;
function scaleFloatThreshold(low, zero, high, min, minThresh, maxThresh, max) {
	var [h0, h1] = minHueRange(RGBtoHSV(...rgb(low)).h, RGBtoHSV(...rgb(high)).h),
		colors = _.range(h0, h1, (h1 - h0) / maxHues).map(h =>
			_.range(0, 1, 1 / maxSaturations).map(s => rgbToArray(HSVtoRGB(h, s, 1))));
	return {
		// trend is [0, 1], representing net amplification vs. deletion.
		// power is [0, dataMax], representing avg. distance from mid point.
		lookup: (trend, power) => {
			if (power == null) {
				return [128, 128, 128];
			}
			// We project [maxThresh, max] to saturation [0, 1].
			// minThresh does not affect color in this drawing mode.
			var s = clip(0, maxSaturations - 1, (power - maxThresh) / (max - maxThresh) * maxSaturations),
				h = clip(0, maxHues - 1, trend * maxHues),
				c = colors[~~h][~~s];

			return c;
		}
	};
}

var noDataScale = () => "gray";
noDataScale.domain = () => [];

var colorPowerScale = ([type, ...args])=> ({
	'no-data': () => noDataScale,
	'float-thresh-pos': () => noDataScale,
	'float-thresh-neg': () => noDataScale,
	'float-thresh': (__, ...args) => scaleFloatThreshold(...args),
}[type](type, ...args));

// We compute trend by projecting onto the upper right quadrant of
// the unit circle. For each segment we compute the difference
// from the midpoint (determined by min, max settings). We sum
// positive differences (amplification) and use as the x coordinate.
// We sum negative differences (deletions) and use as the ycoordinate.
// Then we use atan2 to find the angle, and normalize by PI/2 to
// give a range [0, 1].
//
// We compute power as root-mean-square from the midpoint.
function trendPowerNullIter(iter, min, minThresh, maxThresh, max) {
	var count = 0,
		mid = (min + max) / 2,
		highs = 0,
		lows = 0,
		sqsum = 0,
		v,
		diff,
		n;
	if (!iter) {
		return null;
	}
	n = iter.next();
	while (!n.done) {
		if (n.value.value != null) {
			v = n.value.value;
			if (v < mid) {
				lows += mid - v;
			} else {
				highs += v - mid;
			}
			count += 1;
			diff = v - mid;
			sqsum += diff * diff;
		}
		n = iter.next();
	}
	if (count > 0) {
		return [2 * Math.atan2(highs, lows) / Math.PI, Math.sqrt(sqsum / count)];
	}
	return [null, null];
}

// Render segments using trend and power to select color and saturation,
// respectively. This avoids the problem of averaging, which draws nearby
// amplification and deletion as white, since they average to zero.
function drawImgSegmentsPower(vg, colorSpec, index, count, width, height, zoom, nodes) {
	var {lookup} = colorPowerScale(colorSpec),
		ctx = vg.context(),
		img = ctx.createImageData(width, height), // XXX cache & reuse?
		regions = findRegions(index, height, count),
		toPxRow = v => ~~((v.y - index) * height / count), // ~~ for floor
		byRow = _.groupBy(nodes, toPxRow);

	for (let is in byRow) {
		var i = parseInt(is, 10); // Ugh.
		let rowI = byRow[i];

		if (!rowI) {
			continue;
		}
		// Using sort vs. _.sortBy because it's faster.
		let ends = rowI.slice(0).sort(byEnd),
			starts = rowI.slice(0).sort(byStart),
			len = rowI.length,
			scope = new Set(), // XXX is Set slow?
			pxStart = starts[0].xStart,
			pxEnd,
			nextStartNode, nextEndNode,
			j = 0, k = 0, l;

		while(j < len || k < len) {
			while (j < len && starts[j].xStart === pxStart) {
				scope.add(starts[j++]);
			}
			while (k < len && ends[k].xEnd === pxStart) {
				scope.delete(ends[k++]);
			}

			if (k >= len) {
				continue;
			}
			nextStartNode = j < len && starts[j];
			nextEndNode = ends[k];
			if (j < len && nextStartNode.xStart < nextEndNode.xEnd - 1) {
				pxEnd = nextStartNode.xStart;
			} else {
				pxEnd = nextEndNode.xEnd;
			}
			// generators with regenerator seem to be slow, perhaps due to try/catch.
			// So, _.meannull generator version, and _.i methods are limiting.
//			let avg = meannullIter(_.i.map(scope.values(), v => v.value)),
			let mp = trendPowerNullIter(scope.values(), ...colorSpec.slice(4, 8)), // this is much faster than _.i.map
				lastRow = i + regions[i],
				color = lookup(...mp);
			for (let r = i; r < lastRow; ++r) {
				let pxRow = r * width,
					buffStart = (pxRow + pxStart) * 4,
					buffEnd = (pxRow + pxEnd) * 4;

				for (l = buffStart; l < buffEnd; l += 4) {
					img.data[l] = color[0];
					img.data[l + 1] = color[1];
					img.data[l + 2] = color[2];
					img.data[l + 3] = 255; // XXX can we set + 3 to 255 globally?
				}
			}
			pxStart = pxEnd;
		}
	}
	ctx.putImageData(img, 0, 0);
}

var drawSegmentedPixel = drawSegments => (vg, props) => {
	let {width, zoom, nodes, color} = props,
		{count, height, index} = zoom;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let {samples, index: {bySample: samplesInDS}} = props,
		last = index + count,
		toDraw = nodes.filter(v => v.y >= index && v.y < last),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]),
		stripes = backgroundStripes(hasValue);

	if (nodes.length > 0) {
		drawBackground(vg, width, height);
		drawSegments(vg, color, index, count, width, height, zoom, toDraw);
	}
	labelNulls(vg, width, height, count, stripes);
	labelValues(vg, width, zoom, toDraw);
};


module.exports = {
	findRegions,
	drawSegmented,
	drawSegmentedPixel: drawSegmentedPixel(drawImgSegments),
	drawSegmentedPower: drawSegmentedPixel(drawImgSegmentsPower),
	radius,
	minVariantHeight,
	toYPx,
	labelFont
};
