'use strict';

// color scale variants

var _ = require('underscore');
var {rgb, RGBToHex, RGBtoHSV, HSVtoRGB} = require('./color_helper');

// d3_category20, replace #7f7f7f gray (that aliases with our N/A gray of #808080) with dark grey #434348
var categoryMore = [
		"#1f77b4", // dark blue
//		"#17becf", // dark blue-green
		"#d62728", // dark red
		"#9467bd", // dark purple
		"#ff7f0e", // dark orange
		"#8c564b", // dark brown
		"#e377c2", // dark pink
		"#2ca02c", // dark green
		"#bcbd22", // dark mustard
//		"#434348", // very dark grey
		"#aec7e8", // light blue
//		"#9edae5", // light blue-green
		"#dbdb8d", // light mustard
		"#ff9896", // light salmon
		"#c5b0d5", // light lavender
		"#ffbb78", // light orange
		"#c49c94", // light tan
		"#f7b6d2", // light pink
		"#98df8a", // light green
//		"#c7c7c7"  // light grey
	];

var round = Math.round;
function linearColorScale(domain, range) {
	function scale(v, i = 0) {
		if (v < domain[i]) {
			if (i === 0) {
				return range[0];
			}
			let dx = v - domain[i - 1],
				x = domain[i] - domain[i - 1];

			return [round(dx * (range[i][0] - range[i - 1][0]) / x + range[i - 1][0]),
			        round(dx * (range[i][1] - range[i - 1][1]) / x + range[i - 1][1]),
			        round(dx * (range[i][2] - range[i - 1][2]) / x + range[i - 1][2])];
		}
		if (i === domain.length - 1) {
			return range[domain.length - 1];
		}
		return scale(v, i + 1);
	}
	return scale;
}

// for now, only support one range
var log2ColorScale = ([d0, d1], [r0, r1]) => {
	var mb = _.mmap(r0, r1, (c0, c1) => {
		var ld0 = Math.log2(d0),
			ld1 = Math.log2(d1),
			m = (c1 - c0) / (ld1 - ld0),
			b = c1 - m * ld1;
		return {m, b};
	});
	return v => {
		if (v < d0) {
			return r0;
		}
		if (v > d1) {
			return r1;
		}
		return [round(mb[0].m * Math.log2(v) + mb[0].b),
		        round(mb[1].m * Math.log2(v) + mb[1].b),
		        round(mb[2].m * Math.log2(v) + mb[2].b)];
	};
};

// This behaves like a d3 scale, in that it provides range() and domain().
// It additionally provides rgb(), which projects to an rgb triple, instead
// of a color string, and rgbRange(), which returns the range as rgb triples.
// It doesn't not support other d3 scale methods.
var createScale = (scaleFn, domain, strRange) => {
	var range = strRange.map(rgb),
		scale = scaleFn(domain, range),
		rgbFn = v => v == null ? v : scale(v),
		fn = v => {
			var rgb = rgbFn(v);
			return rgb ? RGBToHex(...rgb) : rgb;
		};
	fn.range = () => strRange;
	fn.domain = () => domain;
	fn.rgbRange = () => range;
	fn.rgb = rgbFn;
	return fn;
};

var setPrecision = x => parseFloat(x.toPrecision(2));

var scaleFloatSingle = (low, high, min, max) =>
	createScale(linearColorScale, [min, max], [low, high]);

var scaleFloatThresholdNegative = (low, zero, min, thresh) =>
	createScale(linearColorScale, _.map([min, thresh], setPrecision), [low, zero]);

var scaleFloatThresholdPositive = (zero, high, thresh, max) =>
	createScale(linearColorScale, _.map([thresh, max], setPrecision), [zero, high]);

var scaleFloatThreshold = (low, zero, high, min, minThresh, maxThresh, max) =>
	createScale(linearColorScale, _.map([min, minThresh, maxThresh, max], setPrecision), [low, zero, zero, high]);

var scaleFloatThresholdLogNegative = (low, zero, min, thresh) =>
	createScale(log2ColorScale, _.map([min, thresh], setPrecision), [low, zero]);

var scaleFloatThresholdLogPositive = (zero, high, thresh, max) =>
	createScale(log2ColorScale, _.map([thresh, max], setPrecision), [zero, high]);

var scaleFloatLog = (low, high, min, max) =>
	createScale(log2ColorScale, _.map([min, max], setPrecision), [low, high]);

//var ordinal = (count, custom) => d3.scaleOrdinal().range(custom || categoryMore).domain(_.range(count));
// d3 ordinal scales will de-dup the domain using an incredibly slow algorithm.
var ordinal = (count, scale) => {
	scale = scale || categoryMore; // handle null
	return v => scale[v % scale.length];
};

function scaleFloatDouble(low, zero, high, min, max) {
	var absmax = Math.max(-min, max);

	return createScale(linearColorScale, [-absmax, 0, absmax], [low, zero, high]);
}

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);
var rgbToArray = obj => [obj.r, obj.g, obj.b];

// Find the minimum path from h0 to h1 in the hue space, which
// wraps at 1.
function minHueRange(h0, h1) {
	var [low, high] = h0 < h1 ? [h0, h1] : [h1, h0];
	return high - low > low + 1 - high ? [high, low + 1] : [low, high];
}

function scaleTrendAmplitude(low, zero, high, origin, thresh, max) {
	var [h0, h1] = minHueRange(RGBtoHSV(...rgb(low)).h, RGBtoHSV(...rgb(high)).h);
	return {
		// trend is [0, 1], representing net amplification vs. deletion.
		// power is [0, dataMax], representing avg. distance from zero point.
		lookup: (trend, power) => {
			if (power == null) {
				return [128, 128, 128];
			}
			var h = clip(h0, h1, h0 + trend * (h1 - h0));
			var s = clip(0, 1, (power - thresh) / (max - origin - thresh));
			return rgbToArray(HSVtoRGB(h, s, 1));
		}
	};
}

// https://stackoverflow.com/questions/7251872/is-there-a-better-color-scale-than-the-rainbow-colormap
var isoStops = [
	[0.847, 0.057, 0.057],
	[0.527, 0.527, 0],
	[0, 0.592, 0],
	[0, 0.559, 0.559],
	[0.316, 0.316, 0.991],
	[0.718, 0, 0.718]].map(fr => fr.map(v => 255 * v));

function isoluminant(low, high) {
	var count = isoStops.length,
		stop = (high - low) / count,
		clip = i => i < 0 ? 0 : i > count - 1 ? count - 1 : i;
	return v => {
		var p = clip((v - low) / stop),
			h = isoStops[Math.ceil(p)],
			li = Math.floor(p),
			l = isoStops[li],
			f = p - li;
		return `rgb(${~~(l[0] * (1 - f) + h[0] * f)},${~~(l[1] * (1 - f) + h[1] * f)},${~~(l[2] * (1 - f) + h[2] * f)})`;
	};
}

// A scale for when we have no data. Implements the scale API
// so we don't have to put a bunch of special cases in the drawing code.
var noDataScale = () => "gray";
noDataScale.domain = () => [];

var colorScale = {
	'no-data': () => noDataScale,
	'float-pos': (__, ...args) => scaleFloatSingle(...args),
	'float-neg': (__, ...args) => scaleFloatSingle(...args),
	'float': (__, ...args) => scaleFloatDouble(...args),
	'float-thresh-pos': (__, ...args) => scaleFloatThresholdPositive(...args),
	'float-thresh-neg': (__, ...args) => scaleFloatThresholdNegative(...args),
	'float-thresh': (__, ...args) => scaleFloatThreshold(...args),
	'float-thresh-log-pos': (__, ...args) => scaleFloatThresholdLogPositive(...args),
	'float-thresh-log-neg': (__, ...args) => scaleFloatThresholdLogNegative(...args),
	'float-log': (__, ...args) => scaleFloatLog(...args),
	'trend-amplitude': (__, ...args) => scaleTrendAmplitude(...args),
	'ordinal': (__, ...args) => ordinal(...args)
};

module.exports =  {
	colorScale: ([type, ...args]) => colorScale[type](type, ...args),
	categoryMore: categoryMore,
	isoluminant
};
