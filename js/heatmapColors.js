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
		categoryMore = [
			"#1f77b4", // dark blue
			"#aec7e8", // light blue
			"#2ca02c", // dark green
			"#98df8a", // light green
			"#d62728", // dark red
			"#ff9896", // light salmon
			"#9467bd", // dark purple
			"#c5b0d5", // light lavender
			"#ff7f0e", // dark orange
			"#ffbb78", // light orange
			"#8c564b", // dark brown
			"#c49c94", // light tan
			"#e377c2", // dark pink
			"#f7b6d2", // light pink
			"#bcbd22", // dark mustard
			"#dbdb8d", // light mustard
			"#17becf", // dark blue-green
			"#9edae5", // light blue-green
			"#c7c7c7" // light grey
		],

		// d3_category20, without grey or pastels
		categoryLess = [
			"#1f77b4", // dark blue
			"#2ca02c", // dark green
			"#d62728", // dark red
			"#9467bd", // dark purple
			"#ff7f0e", // dark orange
			"#8c564b", // dark brown
			"#e377c2", // dark pink
			"#bcbd22", // dark mustard
			"#17becf" // dark blue-green
		];

		// d3_category20, reordered dark to light, without the #7f7f7f gray that aliases with our N/A gray of #808080
		/*category = [
			"#1f77b4", // dark blue
			"#ff7f0e", // dark orange
			"#2ca02c", // dark green
			"#d62728", // dark red
			"#9467bd", // dark purple
			"#8c564b", // dark brown
			"#e377c2", // dark pink
			"#c7c7c7", // light grey
			"#dbdb8d", // light mustard
			"#9edae5", // light blue-green
			"#aec7e8", // light blue
			"#ffbb78", // light orange
			"#98df8a", // light green
			"#ff9896", // light salmon
			"#c5b0d5", // light lavender
			"#c49c94", // light tan
			"#f7b6d2", // light pink
			"#bcbd22", // dark mustard
			"#17becf"  // dark blue-green
		];*/

		// bright: colorBrewer.org 9-class Set1, without the  gray
		//            red        blue       green      purple     orange     yellow     brown      pink
		//category = ["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"];

		// bright reversed: colorBrewer.org 9-class Set1, without the  gray
		//            pink       brown      yellow     orange     purple     green      blue       red
		// category = ["#f781bf", "#a65628", "#ffff33", "#ff7f00", "#984ea3", "#4daf4a", "#377eb8", "#e41a1c"];

		// bright, red third: colorBrewer.org 9-class Set1, without the  gray
		//             blue       green      red        purple     orange     yellow     brown      pink
		//category = ["#377eb8", "#4daf4a", "#e41a1c", "#984ea3", "#ff7f00", "#ffff33", "#a65628", "#f781bf"];

		// less pastel: colorBrewer.org 8-class Set2, without the  gray
		//category = ["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494"];

		// most pastel: colorBrewer.org 9-class Set3, without the  gray
		//category = ["#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5"];

	function scale_categoryMore() {
		return d3.scale.ordinal().range(categoryMore);
	}

	function scale_categoryLess() {
		return d3.scale.ordinal().range(categoryLess);
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
			if (codes.length > 9) {
				return 'codedMore';
			} else {
				return 'codedLess';
			}
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

	function color_categoryMore(column, feature, codes) {
		return saveUndefined(scale_categoryMore().domain(range(codes.length)));
	}

	function color_categoryLess(column, feature, codes) {
		return saveUndefined(scale_categoryLess().domain(range(codes.length)));
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
		categoryMore: color_categoryMore,
		categoryLess: color_categoryLess,
		categoryBreak: 9 // more codes than this uses categoryMore
	};
});
