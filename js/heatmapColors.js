'use strict';

// Pick color scales based on metadata

var _ = require('underscore');
var multi = require('./multi');

var isNumber = _.isNumber;

var white = '#ffffff',
	blueWhiteRed = ['#0000ff', '#ffffff', '#ff0000'],
	greenBlackRed = ['#00ff00', '#000000', '#ff0000'],
	blueBlackYellow =  ['#0000ff', '#000000', '#ffff00'],
	whiteBlack = ['#ffffff', '#ffffff', '#000000'];

var defaultColors = {
	'clinical': blueWhiteRed,
	'default': blueWhiteRed,
	'expression': greenBlackRed,
	'blueBlackYellow': blueBlackYellow,
	'whiteBlack': whiteBlack
};

var defaultColorClass = 'default';

function defaultNormal2color (vizSettings, defaultNormalization) {
	return "normal2" === (vizSettings && !vizSettings.origin && !vizSettings.max && vizSettings.colNormalization)
		|| ((!vizSettings || _.keys(vizSettings).length === 0) && defaultNormalization);
}

function colorRangeType(column) {
	return column.valueType === 'coded' ? 'coded' :
		(column.fieldType === 'clinical' ? 'float' :
		 (column.fieldType === 'segmented' ? 'segmented' : 'floatGenomicData'));
}

var colorRange = multi(colorRangeType);

function colorFloat({colorClass}, settings = {}, codes, data) {
	var values = data.values,
		[low, zero, high] = defaultColors[settings.colorClass || colorClass],
		min = ( settings.min != null ) ? settings.min : _.minnull(values),
		max = ( settings.max != null ) ? settings.max : _.maxnull(values),
		minStart = settings.minstart,
		maxStart = settings.maxstart,
		spec;

	if (!isNumber(max) || !isNumber(min)) {
		return ['no-data'];
	}
	if ((minStart != null) && (maxStart != null) && !isNaN(minStart) && !isNaN(maxStart) ) { //custom setting
		spec = ['float-thresh', low, zero, high, min, minStart, maxStart, max];
	} else if (min >= 0 && max >= 0) {
		spec = ['float-pos', zero, high, min, max];
	} else if (min <= 0 && max <= 0) {
		spec = ['float-neg', low, zero, min, max];
	} else {
		spec = ['float', low, zero, high, min, max];
	}
	return spec;
}

function colorCoded(column, settings, codes, __, customColors) {
	return ['ordinal', codes.length, customColors];
}


function colorFloatGenomicData(column, settings = {}, codes, data) {
	// not sure why we're looking up vizSettings when it's already passed in as 'settings'.
	var vizSettings = _.getIn(column, ["vizSettings", "colNormalization"]),
		defaultNormalization = column.defaultNormalization,
		colSubtractMean = (vizSettings === "subset") ||
	 		(vizSettings == null && defaultNormalization && typeof defaultNormalization === 'boolean'),
		colLog = (vizSettings === "log2(x)") ||
			(vizSettings == null && defaultNormalization && defaultNormalization === 'log2(x)'),
		colorClass = column.colorClass;

	var values = data.values,
		originalMin = _.minnull(values),
		originalMax = _.maxnull(values),
		transformedMax, transformedMin,
		mean = data.mean;

	if (colSubtractMean) {
		transformedMin = originalMin - mean;
		transformedMax = originalMax - mean;
	} else if (colLog) {
		// double check log scale can work, we allow value =0  by using log (x+1);
		if (originalMin <= -1) {
			console.log('data should not have values <= -1, log (x+1) math will not work, set to no color transformation');
			transformedMin = originalMin;
			transformedMax = originalMax;
			colLog = false;
		} else {
			transformedMin = Math.log2(originalMin + 1);
			transformedMax = Math.log2(originalMax + 1);
		}
	} else {
		transformedMin = originalMin;
		transformedMax = originalMax;
	}

	var	[low, zero, high] = defaultColors[settings.colorClass || colorClass],
		minStart = settings.minstart,
		maxStart = settings.maxstart,
		spec,
		mid,
		absmax,
		zone;

	if (!isNumber(originalMax) || !isNumber(originalMin)) {
		return ['no-data'];
	}

	if ((settings.min != null) && (settings.max != null))  { //custom setting
		if (isNaN(minStart)  || isNaN(maxStart) || (minStart === null) || (maxStart === null)) {
			mid = (settings.max  + settings.min) / 2.0;
			zone = (settings.max  - settings.min) / 4.0;
			minStart = mid  -  zone / 2.0;
			maxStart = mid  +  zone / 2.0;
		}
		spec = ['float-thresh', low, zero, high, settings.min, minStart, maxStart, settings.max];
	} else if (transformedMin < 0 && transformedMax > 0) {
		absmax = Math.max(-transformedMin, transformedMax);
		zone = absmax / 4.0;
		if (colSubtractMean) {
			spec = ['float-thresh', low, zero, high, -absmax / 2.0 + mean, -zone / 2.0 + mean,
			zone / 2.0 + mean, absmax / 2.0 + mean];
		} else if (colLog) {
			spec = ['float-log', low, high, Math.pow(2, -absmax / 2.0) - 1.0, Math.pow(2, absmax / 2.0) - 1.0]; // no threshold
		} else {
			spec = ['float-thresh', low, zero, high, -absmax / 2.0, -zone / 2.0,
			zone / 2.0, absmax / 2.0 ];
		}
	} else if (transformedMin >= 0 && transformedMax >= 0) {
		zone = (transformedMax - transformedMin) / 4.0;
		if (colSubtractMean) {
			spec = ['float-thresh-pos', zero, high, transformedMin + zone + mean, transformedMax - zone / 2.0 + mean];
		} else if (colLog) {
			if ( transformedMin === 0 && transformedMax === 0) { // this applis to all original data are zeros case
				spec = ['float-pos', zero, high, 0, 0];
			} else {
				spec = ['float-thresh-log-pos', zero, high, Math.pow(2, transformedMin + zone) - 1.0, Math.pow(2, (transformedMax - zone / 2.0)) - 1.0];
			}
		} else {
			spec = ['float-thresh-pos', zero, high, transformedMin + zone, transformedMax - zone / 2.0];
		}
	} else { // transformedMin <= 0 && transformedMax <= 0
		zone = (transformedMax - transformedMin) / 4.0;
		if (colSubtractMean) {
			spec = ['float-thresh-neg', low, zero, transformedMin + zone / 2.0 + mean, transformedMax - zone + mean];
		} else if (colLog) {
			spec = ['float-thresh-log-neg', low, zero, Math.pow(2, transformedMin + zone / 2.0) - 1.0, Math.pow(2, transformedMax - zone) - 1.0];
		} else {
			spec = ['float-thresh-neg', low, zero, transformedMin + zone / 2.0, transformedMax - zone];
		}
	}
	return spec;
}

var prec2 = x => parseFloat(x.toPrecision(2));

function colorSegmented(column, settings = {}, codes, data) {
	var values = data,
		[low, , high] = defaultColors[settings.colorClass || column.colorClass],
		minVal = _.minnull(values),
		maxVal = _.maxnull(values),
		{origin, thresh, max} = settings || {},
		spec,
		absmax,
		zone,
		normal2 = defaultNormal2color(_.getIn(column, ["vizSettings"]), column.defaultNormalization);

	if (!isNumber(maxVal) || !isNumber(minVal)) {
		return ['no-data'];
	}

	if ((origin != null) && (thresh != null) && (max != null))  { //custom setting
		spec = ['trend-amplitude', low, white, high, origin, thresh, max];
	} else {
		absmax = Math.max(-minVal, maxVal);
		zone = absmax / 4.0;
		if (normal2) {  // auto coloring for vizSettings = normal2
			spec = ['trend-amplitude', low, white, high,
				 2, 0, 6];
		} else { // vizSettings = none
			spec = ['trend-amplitude', low, white, high,
				 0, prec2(zone / 2.0), prec2(absmax / 2.0)];
		}
	}
	return spec;
}

colorRange.add('float', colorFloat);
colorRange.add('coded', colorCoded);
colorRange.add('floatGenomicData', colorFloatGenomicData);
colorRange.add('segmented', colorSegmented);

module.exports =  {
	colorSpec: colorRange,
	defaultColors,
	defaultColorClass,
	defaultNormal2color
};
