/*jslint browser: true, nomen: true */
/*global define: false */

define(["lib/d3",
		"lib/underscore",
		"multi"
	], function (d3, _, multi) {

	'use strict';

	var uniq = _.uniq,
		isNumber = _.isNumber,
		isUndefined = _.isUndefined,
		filter = _.filter,
		range = _.range,
		color_range,
		// d3_category20, without the #7f7f7f gray that aliases with our N/A gray of #808080
		//category = [ "#1f77b4", "#aec7e8", "#ff7f0e", "#ffbb78", "#2ca02c", "#98df8a", "#d62728", "#ff9896", "#9467bd", "#c5b0d5", "#8c564b", "#c49c94", "#e377c2", "#f7b6d2", "#c7c7c7", "#bcbd22", "#dbdb8d", "#17becf", "#9edae5" ],
		// bright: colorBrewer.org 9-class Set1, without the  gray
		//            red        blue       green      purple     orange     yellow     brown      pink
		category = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"];
		// less pastel: colorBrewer.org 8-class Set2, without the  gray
		//category = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"];
		// most pastel: colorBrewer.org 9-class Set3, without the  gray
		//category = ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5"];

	function scale_category() {
		return d3.scale.ordinal().range(category);
	}

	// Return a new function that preserves undefined arguments, otherwise calls the original function.
	// This is to work-around d3 scales.
	function saveUndefined(fn) {
		return function (v) {
			return isUndefined(v) ? v : fn(v);
		};
	}

	color_range = multi(function (column, features, codes) {
		if (features && features.valuetype === 'category' && codes) {
			return 'coded';
		}
		if (column.min && column.max) {
			return 'scaled';
		}
		return 'minMax';
	});

	function color_float_negative(low, zero, min, max) {
		return d3.scale.linear()
			.domain([min, max])
			.range([low, zero]);
	}

	function color_float_positive(zero, high, min, max) {
		return d3.scale.linear()
			.domain([min, max])
			.range([zero, high]);
	}

	function color_float_double(low, zero, high, min, max) {
		var absmax = Math.max(-min, max);

		return d3.scale.linear()
			.domain([-absmax, 0, absmax])
			.range([low, zero, high]);
	}

	function color_float(column, feature, codes, data) {
		var colorfn,
			values = _.values(data || [0]), // handle degenerate case
			max = d3.max(values),
			low = column.colors[0],
			zero = column.colors[1],
			high = column.colors[2],
			min;

		if (!isNumber(max)) {
			return null;
		}
		min = d3.min(values);
		if (min >= 0 && max >= 0) {
			colorfn = color_float_positive(zero, high, min, max);
		} else if (min <= 0 && max <= 0) {
			colorfn = color_float_negative(low, zero, min, max);
		} else {
			colorfn = color_float_double(low, zero, high, min, max);
		}
		return saveUndefined(colorfn);
	}

	function color_category(column, feature, codes) {
		return saveUndefined(scale_category().domain(range(codes.length)));
	}

	function color_scaled(column) {
		var low = column.colors[0],
			zero = column.colors[1],
			high = column.colors[2];

		return saveUndefined(d3.scale.linear()
			.domain([column.min, (column.min + column.max) / 2, column.max])
			.range([low, zero, high]));
	}

	return {
		range: color_range,
		float: color_float,
		scaled: color_scaled,
		category: color_category,
		categoryLength: category.length
	};
});
