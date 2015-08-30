/*eslint strict: [2, "function"] */
/*global define: false */

define(['d3',
		'underscore',
		"multi"
	], function (d3, _, multi) {

	'use strict';

	var isNumber = _.isNumber,
		isUndefined = _.isUndefined,
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
				"phenotype": schemes.greenBlackYellow
			};


		// XXX it's rather broken that these conditionals appear here, in
		// addition to in the colorRange multi
		return function (column) {
			var {type, dataSubType} = column || {};
			var t = (type === 'clinicalMatrix') ?  'phenotype' : dataSubType;
			return defaults[t] || schemes.blueWhiteRed;
		};
	}());

	// Return a new function that preserves undefined arguments, otherwise calls the original function.
	// This is to work-around d3 scales.
	function saveUndefined(fn) {
		var newfn = function (v) {
			return isUndefined(v) ? v : fn(v);
		};
		return _.extend(newfn, fn); // This weirdness copies d3 fn methods
	}

	var ordinal = count => d3.scale.ordinal().range(categoryMore).domain(_.range(count));

	// 'column' is the column type set by the UI. It's not the dataset metadata.
	// It is *based on* the dataset metadata. We use it to decide whether to
	// use clinical vs. genomic scaling for floats.
	// 'settings' is the vizSettings: user override of min/max, etc.
	// 'codes' is also used to pick categorical.
	// 'data' is used to find min/max.
	//
	//  Of these, we can't drop 'data' or 'codes'.
	//  Perhaps we should just pass in column.type and dataSubType, since we don't
	//  need all the other params.
	function colorRangeType(column, settings, codes) {
		if (codes) {
			return 'coded';
		}
		if (column && column.type === "genomicMatrix") {
			return 'floatGenomicData';
		}
		return 'float';
	}

	var colorRange = multi(colorRangeType);

	var scaleFloatSingle = (low, high, min, max) =>
		d3.scale.linear().domain([min, max]).range([low, high]);

	function scaleFloatDouble(low, zero, high, min, max) {
		var absmax = Math.max(-min, max);

		return d3.scale.linear()
			.domain([-absmax, 0, absmax])
			.range([low, zero, high]);
	}

	function colorFloat(column, settings, codes, data) {
		var values = _.values(data || [0]), // handle degenerate case
			max = d3.max(values),
			[low, zero, high] = defaultColors(column),
			spec,
			min;

		if (!isNumber(max)) {
			return null;
		}
		min = d3.min(values);
		if (min >= 0 && max >= 0) {
			spec = ['float-pos', zero, high, min, max];
		} else if (min <= 0 && max <= 0) {
			spec = ['float-neg', low, zero, min, max];
		} else {
			spec = ['float', low, zero, high, min, max];
		}
		return spec;
	}

	function colorCoded(column, settings, codes) {
		return ['ordinal', codes.length];
	}

	var scaleFloatThresholdNegative = (low, zero, min, thresh, max) =>
		d3.scale.linear()
			.domain(_.map([min, thresh, max], x => x.toPrecision(2)))
			.range([low, zero, zero]);

	var scaleFloatThresholdPositive = (zero, high, min, thresh, max) =>
		d3.scale.linear()
			.domain(_.map([min, thresh, max], x => x.toPrecision(2)))
			.range([zero, zero, high]);

	var scaleFloatThreshold = (low, zero, high, min, minThresh, maxThresh, max) =>
		d3.scale.linear()
			.domain(_.map([min, minThresh, maxThresh, max], x => x.toPrecision(2)))
			.range([low, zero, zero, high]);

	function colorFloatGenomicData(column, settings = {}, codes, data) {
		var values = _.values(data), // handle degenerate case
			[low, zero, high] = defaultColors(column),
			min = settings.min || d3.min(values),
			max = settings.max ||  d3.max(values),
			minStart = settings.minStart,
			maxStart = settings.maxStart,
			spec,
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
			spec = ['float-thresh', low, zero, high, min, minStart, maxStart, max];
		} else if (min < 0 && max > 0) {
			absmax = Math.max(-min, max);
			zone = absmax / 4.0;
			spec = ['float-thresh', low, zero, high, -absmax / 2.0, -zone / 2.0,
				 zone / 2.0, absmax / 2.0];
		} else	if (min >= 0 && max >= 0) {
			zone = (max - min) / 4.0;
			spec = ['float-thresh-pos', zero, high, min, min + zone, max - zone / 2.0];
		} else { // min <= 0 && max <= 0
			zone = (max - min) / 4.0;
			spec = ['float-thresh-neg', low, zero, min + zone / 2.0, max - zone, max];
		}
		return spec;
	}

	colorRange.add('float', colorFloat);
	colorRange.add('coded', colorCoded);
	colorRange.add('floatGenomicData', colorFloatGenomicData);

	var colorScale = {
		'float-pos': (__, ...args) => scaleFloatSingle(...args),
		'float-neg': (__, ...args) => scaleFloatSingle(...args),
		'float': (__, ...args) => scaleFloatDouble(...args),
		'float-thresh-pos': (__, ...args) => scaleFloatThresholdPositive(...args),
		'float-thresh-neg': (__, ...args) => scaleFloatThresholdNegative(...args),
		'float-thresh': (__, ...args) => scaleFloatThreshold(...args),
		'ordinal': (__, count) => ordinal(count)
	};

	return {
		colorScale: ([type, ...args]) => saveUndefined(colorScale[type](type, ...args)),
		colorSpec: colorRange,
		defaultColors: defaultColors
	};
});
