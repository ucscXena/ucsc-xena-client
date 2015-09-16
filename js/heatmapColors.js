/*jslint browser: true, nomen: true */
/*global define: false */

define(['d3',
		'underscore',
		"multi"
	], function (d3, _, multi) {

	'use strict';

	var isNumber = _.isNumber,
		isUndefined = _.isUndefined,
		range = _.range,
		color_range,

		categoryMore =
		// d3_category20, replace #7f7f7f gray (that aliases with our N/A gray of #808080) with dark grey #434348
		[
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
		],

		// special category of white and purple
		codedWhite = [
			"#ffffff", // white
			"#9467bd" // dark purple
		],

		defaultColors;


	defaultColors = (function () {
		var schemes = {
				blueWhiteRed: ['#0000ff', '#ffffff', '#ff0000'],
				greenBlackRed: ['#00ff00', '#000000', '#ff0000'],
				greenWhiteRed: ['#00ff00', '#ffffff', '#ff0000'],
				greenBlackYellow: ['#007f00', '#000000', '#ffff00']
				/* with clinical category palette:
				blueWhiteRed: ['#377eb8', '#ffffff', '#e41a1c'],
				greenBlackRed: ['#4daf4a', '#000000', '#e41a1c'],
				greenBlackYellow: ['#4daf4a', '#000000', '#ffff33']
				*/
			},

			defaults = {
				"gene expression": schemes.greenBlackRed,
				"gene expression RNAseq": schemes.greenBlackRed,
				"gene expression array": schemes.greenBlackRed,
				"exon expression RNAseq": schemes.greenBlackRed,
				"phenotype": schemes.greenBlackYellow,
			};


		return function (type, dataSubType) {
			var t = (type === 'clinicalMatrix') ?  'phenotype' : dataSubType;
			return defaults[t] || schemes.blueWhiteRed;
		};
	}());


	function scale_categoryMore() {
		return d3.scale.ordinal().range(categoryMore);
	}

	function scale_codedWhite() {
		return d3.scale.ordinal().range(codedWhite);
	}

	// Return a new function that preserves undefined arguments, otherwise calls the original function.
	// This is to work-around d3 scales.
	function saveUndefined(fn) {
		var newfn = function (v) {
			return isUndefined(v) ? v : fn(v);
		};
		return _.extend(newfn, fn); // XXX This weirdness copies d3 fn methods
	}

	color_range = multi(function (column, settings, features, codes) {
		if (features && codes) {
			if (features.valuetype === 'category') {
				return 'codedMore';
			} else {
				return 'codedWhite';
			}
		}
		if (column.type === "genomicMatrix"){
			return 'float_genomicData';
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

	function color_float(column, settings, feature, codes, data) {
		var colorfn,
			values = _.values(data || [0]), // handle degenerate case
			max = d3.max(values),
			colors = defaultColors(column.type, column.dataSubType),
			low = colors[0],
			zero = colors[1],
			high = colors[2],
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

	function color_categoryMore(column, settings, feature, codes) {
		return saveUndefined(scale_categoryMore().domain(range(codes.length)));
	}

	function color_codedWhite(column, settings, feature, codes) {
		return saveUndefined(scale_codedWhite().domain(range(codes.length)));
	}

//	function color_scaled(column) {
//		var low = column.colors[0],
//			zero = column.colors[1],
//			high = column.colors[2];
//
//		return saveUndefined(d3.scale.linear()
//			.domain([column.min, (column.min + column.max) / 2, column.max])
//			.range([low, zero, high]));
//	}

	function color_float_negative_zone(low, zero, min, max, zone) {
		return d3.scale.linear()
			.domain([min.toPrecision(2), (max-zone).toPrecision(2), max.toPrecision(2)])
			.range([low, zero, zero]);
	}

	function color_float_positive_zone(zero, high, min, max, zone) {
		return d3.scale.linear()
			.domain([min.toPrecision(2), (min+zone).toPrecision(2), max.toPrecision(2)])
			.range([zero, zero, high]);
	}

	function color_custom (low, zero, high, min, max, minStart, maxStart) {
		return d3.scale.linear()
			.domain([min.toPrecision(2),  minStart.toPrecision(2), maxStart.toPrecision(2), max.toPrecision(2)])
			.range([low, zero, zero, high]);
	}

	function color_float_genomicData (column, settings, feature, codes, data) {
		var colorfn,
			values = _.values(data || [0]), // handle degenerate case
			colors = defaultColors(column.type, column.dataSubType),
			low = colors[0],
			zero = colors[1],
			high = colors[2],
			min = (settings.min !== undefined)? settings.min : d3.min(values),
			max = (settings.max !== undefined)? settings.max : d3.max(values),
			minStart = settings.minStart,
			maxStart = settings.maxStart,
			mid,
			absmax,
			zone;

		if (!isNumber(max) || !isNumber(min)) {
			return null; // XXX should verify that we handle this downstream.
		}

		if ( (settings.min!== undefined) && (settings.min !== null) && !isNaN(settings.min)) { //custom setting
			if (isNaN(minStart)  || isNaN(maxStart) || (minStart === null) || (maxStart===null)) {
				mid = (max + min) / 2.0;
				zone = (max - min) / 4.0;
				minStart = mid  -  zone / 2.0;
				maxStart = mid  +  zone / 2.0;
			}
			colorfn = color_custom(low, zero, high, min, max, minStart, maxStart);
		} else if (min < 0 && max > 0) { //auto setting
			absmax = Math.max(-min, max);
			zone = absmax / 4.0;
			colorfn = color_custom(low, zero, high, - absmax / 2.0, absmax / 2.0, - zone / 2.0, zone / 2.0);
		} else	if (min >= 0 && max >= 0) { //auto setting
			zone = (max - min) / 4.0;
			colorfn = color_float_positive_zone(zero, high, min, max - zone / 2.0, zone);
		} else { // min <= 0 && max <= 0  //auto setting
			zone = (max - min) / 4.0;
			colorfn = color_float_negative_zone(low, zero, min + zone / 2.0, max, zone);
		}
		return saveUndefined(colorfn);
	}

	color_range.add('codedWhite', color_codedWhite);
	color_range.add("minMax", color_float);
	color_range.add("codedMore", color_categoryMore);
	color_range.add("float_genomicData", color_float_genomicData);

	return {
		range: color_range,
		'float': color_float,
//		scaled: color_scaled,
		defaultColors: defaultColors,
		codedMore: categoryMore
	};
});
