'use strict';

var _ = require('./underscore_ext');
var colorHelper = require('./color_helper');
var labelMargin = 1; // left & right margin
var labelFont = 12;
var config = require('./config');

// Pick a stripe sample height that is at least one line of text, and is
// a roundish number of samples (10, 50, 100, 500, 1000, ...).
//
// We do this by computing the number of samples in a text line, then
// rounding that up to the next half-order.
//
// XXX 1.2 is lifted from vgmixed, which uses this to set line height for
// a given font. The 0.1 fudge is due to floating point noise, I think. Otherwise
// we can end up with a height that is smaller than one line, and the labels
// will not be drawn due to clipping in vgmixed.
function stripeHeight(start, end, height) {
	var in10 = (end - start) * (1.2 * labelFont + 0.1) / height,
		order = Math.pow(10, Math.floor(Math.log10(in10))),
		fsd = in10 / order, // 1st significant digit, 1..9
		rounded = fsd > 5 ? 10 : fsd > 1 ? 5 : 1;

	return Math.max(rounded * order, 1);
}

function draw(vg, opts) {
	var {height, width, index, count, data, codes} = opts,
		minTxtWidth = vg.textWidth(labelFont, 'WWWW'),
		first = Math.floor(index),
		last = Math.ceil(index + count),
		samplesInStripe = stripeHeight(first, last, height),
		sh = height / (last - first) * samplesInStripe;

	vg.smoothing(false); // For some reason this works better if we do it every time.

	_.range(0, height, sh).forEach((y, i) =>
		vg.box(0, y, width, sh, i % 2 === 0 ? '#CCCCDD' : '#FFFFFF')
	);

	var labelColors = ['#CCCCDD', '#FFFFFF'].map(colorHelper.contrastColor);

	// Add labels
	var rowData = data[0].slice(first, last);

	if (width - 2 * labelMargin >= minTxtWidth) {
		if (samplesInStripe === 1) {
			let h = height / count;

			vg.clip(labelMargin, 0, width - labelMargin, height, () =>
				rowData.forEach((v, i) =>
					vg.textCenteredPushRight(
						labelMargin,
						h * i - 1,
						width - labelMargin,
						h,
						labelColors[i % 2],
						labelFont,
						codes[v]
					)
				)
			);
		} else {
			let mid = Math.floor(height / sh / 2),
				label = config.singlecell ? `${samplesInStripe} cells` : `${samplesInStripe} samples`,
				labelWidth = vg.textWidth(labelFont, label);

			vg.box((width - labelWidth) / 2 - 2, mid * sh, 1, sh, 'black');
			vg.box((width - labelWidth) / 2 - 6, mid * sh, 4, 1, 'black');
			vg.box((width - labelWidth) / 2 - 6, (mid + 1) * sh - 1, 4, 1, 'black');
			vg.clip(labelMargin, 0, width - labelMargin, height, () =>
				vg.textCenteredPushRight(
						labelMargin,
						mid * sh,
						width - labelMargin,
						sh,
						labelColors[mid % 2],
						labelFont,
						config.singlecell ? `${samplesInStripe} cells` : `${samplesInStripe} samples`));
		}
	}
}

var drawSamples = (vg, props) => {
	let {heatmapData, codes, width, zoom} = props,
		{count, height, index} = zoom;

	if (_.isEmpty(heatmapData)) { // no features to draw
		vg.box(0, 0, width, height, "gray");
		return;
	}

	vg.labels(() => {
		draw(vg, {
			height,
			width,
			index,
			count,
			data: heatmapData,
			codes
		});
	});
};

module.exports = {drawSamples, stripeHeight};
