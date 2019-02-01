'use strict';

var _ = require('./underscore_ext');
var partition = require('./partition');
var colorScales = require('./colorScales');
var colorHelper = require('./color_helper');

var labelFont = 12;
var labelMargin = 1; // left & right margin

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
	 return groups.map(([start, len]) =>
			 [_.get(codes, rowData[start], null), start, len]);
}

function floatLabels(rowData, minSpan) {
	var nnLabels = minSpan <= 1 ?
			_.filter(rowData.map((v, i) => {
 				return (v % 1) ? [v.toPrecision([3]), i, 1] : [v, i, 1]; // display float with 3 significant digit, integer no change
 			}), ([v]) => v !== null) : [],
		nullLabels = _.filter(findContiguous(rowData, minSpan).map(([start, len]) => [rowData[start], start, len]),
				([v]) => v === null);
	return [...nnLabels, ...nullLabels];
}

function *projectSamples(height, count) {
	for (var i = 0; i < count; ++i) {
		var y = Math.floor(i * height / count),
			h = Math.floor((i + 1) * height / count) - y;
		yield {y, start: i, end: i, height: h};
	}
}

function *projectPixels(height, count) {
	for (var y = 0; y < height; ++y) {
		var start = Math.ceil(y * count / height),
			end = Math.ceil((y + 1) * count / height) - 1;
		yield {y, start, end, height: 1};
	}
}

export function findRegions(height, count) {
	return (height > count ? projectSamples : projectPixels)(height, count);
}

var gte = l => v => v >= l;
var emptyDomain = () => ({count: 0, sum: 0});

export function tallyDomains(d, start, end, domains, acc = _.times(domains.length + 1, emptyDomain), i = start) {
	var v = d[i];
	if (i === end) {
		return acc;
	}
	if (v !== null) {
		let i = _.findIndexDefault(domains, gte(v), domains.length);
		acc[i].count++;
		acc[i].sum += v;
	}
	return tallyDomains(d, start, end, domains, acc, i + 1);
}

var gray = colorHelper.rgb(colorHelper.greyHEX);
var regionColorMethods = {
	// For ordinal scales, subsample by picking a random data point.
	// Doing slice here to simplify the random selection. We don't have
	// many subcolumns with ordinal data, so this shouldn't be a performance problem.
	'ordinal': (scale, d, start, end) => _.Let((s = d.slice(start, end).filter(x => x != null)) =>
			s.length ? colorHelper.rgb(scale(s[Math.floor(s.length * Math.random())])) : gray),
	// For float scales, compute per-domain average values, and do a weighed mix of the colors.
	'default': (scale, d, start, end) => {
		var domainGroups = tallyDomains(d, start, end, scale.domain()),
			groupColors = domainGroups.map(g => g.count ? scale.rgb(g.sum / g.count) : null),
			groupCounts = domainGroups.map(g => g.count),
			total = _.sum(groupCounts);
		// blend colors via rms
		return _.times(3, ch =>
				~~Math.sqrt(_.sum(_.mmap(groupColors, groupCounts,
					(rgb, n) => rgb == null ? 0 : rgb[ch] * rgb[ch] * n / total))));
	}
};

var regionColor = (type, scale, d, start, end) => (regionColorMethods[type] || regionColorMethods.default)(scale, d, start, end);

function drawLayoutByPixel(vg, opts) {
	var {height, width, index, count, layout, data, codes, colors} = opts,
		minTxtWidth = vg.textWidth(labelFont, 'WWWW'),
		first = Math.floor(index),
		last  = Math.ceil(index + count);

	// reset image
	vg.box(0, 0, width, height, "gray");
	if (data.length === 0) { // no features to draw
		return;
	}

	var ctx = vg.context(),
		img = ctx.createImageData(width, height);

	layout.forEach(function (el, i) {
		var regions = findRegions(height, count);
		var rowData = data[i],
			colorScale = colorScales.colorScale(colors[i]);

		// XXX watch for poor iterator performance in this for...of.
		for (let r of regions) {
			if (_.anyRange(rowData, first + r.start, first + r.end + 1, v => v != null)) {
				let color = regionColor(colors[i][0], colorScale, rowData,
				                        first + r.start, first + r.end + 1);

				for (let y = r.y; y < r.y + r.height; ++y) {
					let pxRow = y * width,
						buffStart = (pxRow + el.start) * 4,
						buffEnd = (pxRow + el.start + el.size) * 4;
					// try typed array at 32 bits, to do this assignment faster?
					for (let l = buffStart; l < buffEnd; l += 4) {
						img.data[l] = color[0];
						img.data[l + 1] = color[1];
						img.data[l + 2] = color[2];
						img.data[l + 3] = 255; // XXX can we set + 3 to 255 globally?
					}
				}
			}
		}
	});
	ctx.putImageData(img, 0, 0);

	layout.forEach(function (el, i) {
		var rowData = data[i].slice(first, last),
			colorScale = colorScales.colorScale(colors[i]);
		// Add labels
		var minSpan = labelFont / (height / count);
		if (el.size - 2 * labelMargin >= minTxtWidth) {
			let labels = codes ? codeLabels(codes, rowData, minSpan) : floatLabels(rowData, minSpan),
				h = height / count,
				uniqStates = _.filter(_.uniq(rowData), c => c != null),
				colorWhiteBlack = (uniqStates.length === 2 &&  // looking for [0,1]  columns color differently
					_.indexOf(uniqStates, 1) !== -1 && _.indexOf(uniqStates, 0) !== -1) ? true : false,
				codedColor = colorWhiteBlack || codes; // coloring as coded column: coded column or binary float column (0s and 1s)

			vg.clip(el.start + labelMargin, 0, el.size - labelMargin, height, () =>
					labels.forEach(([l, i, ih]) => /* label, index, count */
						_.Let((labelColor = colorScale(rowData[i])) =>
							vg.textCenteredPushRight(el.start + labelMargin, h * i - 1, el.size - labelMargin,
								h * ih, (codedColor && labelColor) ? colorHelper.contrastColor(labelColor) : 'black',
								labelFont, l))));
		}
	});
}

var drawHeatmapByMethod = draw => (vg, props) => {
	var {heatmapData = [], codes, colors, width,
			zoom: {index, count, height}} = props;

	vg.labels(() => {
		draw(vg, {
			height,
			width,
			index,
			count,
			data: heatmapData,
			codes,
			layout: partition.offsets(width, 0, heatmapData.length),
			colors
		});
	});
};

export var drawHeatmap = drawHeatmapByMethod(drawLayoutByPixel);
