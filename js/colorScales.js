'use strict';

// color scale variants

var d3 = require('d3-scale');
var _ = require('underscore');
var {rgb, RGBtoHSV, HSVtoRGB} = require('./color_helper');

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
		"#c7c7c7"  // light grey
	];

// Return a new function that preserves undefined arguments, otherwise calls the original function.
// This is to work-around d3 scales.
function saveMissing(fn) {
	var newfn = function (v) {
		return v == null ? v : fn(v);
	};
	return _.extend(newfn, fn); // This weirdness copies d3 fn methods
}

var scaleFloatSingle = (low, high, min, max) =>
	d3.scaleLinear().domain([min, max]).range([low, high]);

var scaleFloatThresholdNegative = (low, zero, min, thresh) =>
	d3.scaleLinear()
		.domain(_.map([min, thresh], x => x.toPrecision(2)))
		.range([low, zero]);

var scaleFloatThresholdPositive = (zero, high, thresh, max) =>
	d3.scaleLinear()
		.domain(_.map([thresh, max], x => x.toPrecision(2)))
		.range([zero, high]);

var scaleFloatThreshold = (low, zero, high, min, minThresh, maxThresh, max) =>
	d3.scaleLinear()
		.domain(_.map([min, minThresh, maxThresh, max], x => x.toPrecision(2)))
		.range([low, zero, zero, high]);

var scaleFloatThresholdLogNegative = (low, zero, min, thresh) =>
	d3.scaleLog().base(2)
		.domain(_.map([min, thresh], x => x.toPrecision(2)))
		.range([low, zero]);

var scaleFloatThresholdLogPositive = (zero, high, thresh, max) =>
	d3.scaleLog().base(2)
		.domain(_.map([thresh, max], x => x.toPrecision(2)))
		.range([zero, high]);

var scaleFloatLog = (low, high, min, max) =>
	d3.scaleLog().base(2)
		.domain(_.map([min, max], x => x.toPrecision(2)))
		.range([low, high]);

//var ordinal = (count, custom) => d3.scaleOrdinal().range(custom || categoryMore).domain(_.range(count));
// d3 ordinal scales will de-dup the domain using an incredibly slow algorithm.
var ordinal = (count, scale) => {
	scale = scale || categoryMore; // handle null
	return v => scale[v % scale.length];
};

function scaleFloatDouble(low, zero, high, min, max) {
	var absmax = Math.max(-min, max);

	return d3.scaleLinear()
		.domain([-absmax, 0, absmax])
		.range([low, zero, high]);
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
		return `rgb(${~~(l[0] * f + h[0] * (1 - f))},${~~(l[1] * f + h[1] * (1 - f))},${~~(l[2] * f + h[2] * (1 - f))})`;
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
	colorScale: ([type, ...args]) => saveMissing(colorScale[type](type, ...args)),
	categoryMore: categoryMore,
	isoluminant
};
