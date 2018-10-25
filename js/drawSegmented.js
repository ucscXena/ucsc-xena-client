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

// Computes contiguous vertial pixel regions.
// There must be a better way to compute this.
function findRegions(index, height, count) {
	var starts = _.uniq(_.times(count, y => ~~(y * height / count))),
		regions = _.partitionN(starts, 2, 1, [height]),
		lens = regions.map(([s, e]) => e - s);
	return _.object(starts, lens);
}

var byEnd = (x, y) => x.xEnd - y.xEnd;
var byStart = (x, y) => x.xStart - y.xStart;

var noDataScale = () => "gray";
noDataScale.domain = () => [];

// We compute trend by projecting onto the upper right quadrant of
// the unit circle. For each segment we compute the difference
// from the midpoint (determined by min, max settings). We sum
// positive differences (amplification) and use as the x coordinate.
// We sum negative differences (deletions) and use as the ycoordinate.
// Then we use atan2 to find the angle, and normalize by PI/2 to
// give a range [0, 1].
//
// We compute power as root-mean-square from the midpoint.
function trendPowerNullIter(iter, zero) {
	var count = 0,
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
			if (v < zero) {
				lows += zero - v;
			} else {
				highs += v - zero;
			}
			count += 1;
			diff = v - zero;
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
function* segmentRegions(colorSpec, index, count, width, height, zoom, nodes) {
	var {lookup} = colorScales.colorScale(colorSpec),
		[,,,, zero] = colorSpec,
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
			j = 0, k = 0;

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
			if (j < len && nextStartNode.xStart < nextEndNode.xEnd) {
				pxEnd = nextStartNode.xStart;
			} else {
				pxEnd = nextEndNode.xEnd;
			}
			// generators with regenerator seem to be slow, perhaps due to try/catch.
			// So, _.meannull generator version, and _.i methods are limiting.
//			let avg = meannullIter(_.i.map(scope.values(), v => v.value)),
			let mp = trendPowerNullIter(scope.values(), zero), // this is much faster than _.i.map
				lastRow = i + regions[i],
				color = lookup(...mp);
			yield {pxStart, pxEnd, color, lastRow, i};
			pxStart = pxEnd;
		}
	}
}

function drawImgSegmentsPixel(vg, colorSpec, index, count, width, height, zoom, nodes) {
	var ctx = vg.context(),
		img = ctx.createImageData(width, height), // XXX cache & reuse?
		regions = segmentRegions(colorSpec, index, count, width, height, zoom, nodes);

	for (var r = regions.next(); !r.done; r = regions.next()) {
		let {pxStart, pxEnd, color, lastRow, i} = r.value, l;
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
	}
	ctx.putImageData(img, 0, 0);
}

var drawSegmentedByMethod = drawSegments => (vg, props) => {
	let {width, zoom, nodes = [], color} = props,
		{count, height, index} = zoom;

	drawBackground(vg, width, height);

	let {samples, index: {bySample: samplesInDS}} = props,
		last = index + count,
		toDraw = nodes.filter(v => v.y >= index && v.y < last),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]),
		stripes = backgroundStripes(hasValue);

	drawSegments(vg, color, index, count, width, height, zoom, toDraw);

	vg.labels(() => {
		labelNulls(vg, width, height, count, stripes);
		labelValues(vg, width, zoom, toDraw);
	});
};


module.exports = {
	findRegions,
	drawSegmented: drawSegmentedByMethod(drawImgSegmentsPixel),
	radius,
	minVariantHeight,
	toYPx,
	labelFont
};
