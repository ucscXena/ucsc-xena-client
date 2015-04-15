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
		colorRange,
		// d3_category20, without the #7f7f7f gray that aliases with our N/A gray of #808080
		categoryMore = [
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


		return function (column) {
			var {type, dataSubType} = column || {};
			var t = (type === 'clinicalMatrix') ?  'phenotype' : dataSubType;
			return defaults[t] || schemes.blueWhiteRed;
		};
	}());

	function scaleCategoryMore() {
		return d3.scale.ordinal().range(categoryMore);
	}

	function scaleCodedWhite() {
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

	colorRange = multi(function (column, settings, features, codes) {
		if (features && codes) {
			if (features.valuetype === 'category') {
				return 'codedMore';
			} else {
				return 'codedWhite';
			}
		}
		if (column.type === "genomicMatrix"){
			return 'floatGenomicData';
		}
		return 'minMax';
	});

	function colorFloatNegative(low, zero, min, max) {
		return d3.scale.linear()
			.domain([min, max])
			.range([low, zero]);
	}

	function colorFloatPositive(zero, high, min, max) {
		return d3.scale.linear()
			.domain([min, max])
			.range([zero, high]);
	}

	function colorFloatDouble(low, zero, high, min, max) {
		var absmax = Math.max(-min, max);

		return d3.scale.linear()
			.domain([-absmax, 0, absmax])
			.range([low, zero, high]);
	}

	function colorFloat(column, settings, feature, codes, data) {
		var values = _.values(data || [0]), // handle degenerate case
			max = d3.max(values),
			[low, zero, high] = defaultColors(column),
			colorfn,
			min;

		if (!isNumber(max)) {
			return null;
		}
		min = d3.min(values);
		if (min >= 0 && max >= 0) {
			colorfn = colorFloatPositive(zero, high, min, max);
		} else if (min <= 0 && max <= 0) {
			colorfn = colorFloatNegative(low, zero, min, max);
		} else {
			colorfn = colorFloatDouble(low, zero, high, min, max);
		}
		return saveUndefined(colorfn);
	}

	function colorCategoryMore(column, settings, feature, codes) {
		return saveUndefined(scaleCategoryMore().domain(range(codes.length)));
	}

	function colorCodedWhite(column, settings, feature, codes) {
		return saveUndefined(scaleCodedWhite().domain(range(codes.length)));
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

	function colorFloatNegativeZone(low, zero, min, max, zone) {
		return d3.scale.linear()
			.domain([min.toPrecision(2), (max-zone).toPrecision(2), max.toPrecision(2)])
			.range([low, zero, zero]);
	}

	function colorFloatPositiveZone(zero, high, min, max, zone) {
		return d3.scale.linear()
			.domain([min.toPrecision(2), (min+zone).toPrecision(2), max.toPrecision(2)])
			.range([zero, zero, high]);
	}

	function colorCustom (low, zero, high, min, max, minStart, maxStart) {
		return d3.scale.linear()
			.domain([min.toPrecision(2),  minStart.toPrecision(2), maxStart.toPrecision(2), max.toPrecision(2)])
			.range([low, zero, zero, high]);
	}

	function colorFloatGenomicData (column, settings, feature, codes, data) {
		var colorfn,
			values = _.values(data || [0]), // handle degenerate case
			[low, zero, high] = defaultColors(column),
			min = settings.min || d3.min(values),
			max = settings.max ||  d3.max(values),
			minStart = settings.minStart,
			maxStart = settings.maxStart,
			mid,
			absmax,
			zone;

		if (!isNumber(max) || !isNumber(min)) {
			return null; // XXX should verify that we handle this downstream.
		}

		if (settings.min) {
			if (!minStart || !maxStart) {
				mid = (max + min) / 2.0;
				zone = (max - min) / 4.0;
				minStart = mid  -  zone / 2.0;
				maxStart = mid  +  zone / 2.0;
			}
			colorfn = colorCustom(low, zero, high, min, max, minStart, maxStart);
		} else if (min <= 0 && max >= 0) {
			absmax = Math.max(-min, max);
			zone = absmax / 4.0;
			colorfn = colorCustom(low, zero, high, - absmax / 2.0, absmax / 2.0, - zone / 2.0, zone / 2.0);
		} else	if (min >= 0 && max >= 0) {
			zone = (max - min) / 4.0;
			colorfn = colorFloatPositiveZone(zero, high, min, max - zone / 2.0, zone);
		} else { // min <= 0 && max <= 0
			zone = (max - min) / 4.0;
			colorfn = colorFloatNegativeZone(low, zero, min + zone / 2.0, max, zone);
		}
		return saveUndefined(colorfn);
	}

	colorRange.add('codedWhite', colorCodedWhite);
	colorRange.add("minMax", colorFloat);
	colorRange.add("codedMore", colorCategoryMore);
	colorRange.add("floatGenomicData", colorFloatGenomicData);

	return {
		range: colorRange,
		'float': colorFloat,
//		scaled: color_scaled,
		defaultColors: defaultColors,
		codedMore: categoryMore
	};
});
