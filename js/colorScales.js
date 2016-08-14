// color scale variants

/*global require: false, module: false */
'use strict';

var d3 = require('d3-scale');
var _ = require('underscore');

// d3_category20, replace #7f7f7f gray (that aliases with our N/A gray of #808080) with dark grey #434348
var categoryMore = [
		"#1f77b4", // dark blue
		"#aec7e8", // light blue
		"#2ca02c", // dark green
		"#98df8a", // light green
		"#d62728", // dark red
		"#ff9896", // light salmon
		"#ff7f0e", // dark orange
		"#ffbb78", // light orange
		"#9467bd", // dark purple
		"#c5b0d5", // light lavender
		"#8c564b", // dark brown
		"#c49c94", // light tan
		"#e377c2", // dark pink
		"#f7b6d2", // light pink
		"#bcbd22", // dark mustard
		"#dbdb8d", // light mustard
		"#17becf", // dark blue-green
		"#9edae5", // light blue-green
		"#434348", // very dark grey
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

var ordinal = count => d3.scaleOrdinal().range(categoryMore).domain(_.range(count));

function scaleFloatDouble(low, zero, high, min, max) {
	var absmax = Math.max(-min, max);

	return d3.scaleLinear()
		.domain([-absmax, 0, absmax])
		.range([low, zero, high]);
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
	'ordinal': (__, count) => ordinal(count)
};

module.exports =  {
	colorScale: ([type, ...args]) => saveMissing(colorScale[type](type, ...args)),
	categoryMore: categoryMore
};
