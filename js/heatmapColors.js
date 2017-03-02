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

var subTypeClass = ({dataSubType}) =>
	dataSubType && dataSubType.indexOf('expression') !== -1 ? 'expression' : 'default';

var typeClass = {
	clinicalMatrix: () => 'clinical',
	mutationVector: () => 'mutation'
};

var defaultColorClass = dataset => (typeClass[dataset.type] || subTypeClass)(dataset);

function colorRangeType(column) {
	return column.valueType === 'coded' ? 'coded' :
		(column.fieldType === 'clinical' ? 'float' :
		 (column.fieldType === 'segmented' ? 'segmented' : 'floatGenomicData'));
}

var colorRange = multi(colorRangeType);

function colorFloat({colorClass}, settings = {}, codes, data) {
	var values = data,
		[low, zero, high] = defaultColors[settings.colorClass || colorClass],
		min = ( settings.min != null ) ? settings.min : _.minnull(values),
		max = ( settings.max != null ) ? settings.max : _.maxnull(values),
		minStart = settings.minStart,
		maxStart = settings.maxStart,
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

function colorFloatGenomicData({colorClass}, settings = {}, codes, data) {
	var values = data,
		[low, zero, high] = defaultColors[settings.colorClass || colorClass],
		min = ( settings.min != null ) ? settings.min : _.minnull(values),
		max = ( settings.max != null ) ? settings.max : _.maxnull(values),
		minStart = settings.minStart,
		maxStart = settings.maxStart,
		spec,
		mid,
		absmax,
		zone;

	if (!isNumber(max) || !isNumber(min)) {
		return ['no-data'];
	}

	if ((settings.min != null) && (settings.max != null))  { //custom setting
		if (isNaN(minStart)  || isNaN(maxStart) || (minStart === null) || (maxStart === null)) {
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
		spec = ['float-thresh-pos', zero, high, min + zone, max - zone / 2.0];
	} else { // min <= 0 && max <= 0
		zone = (max - min) / 4.0;
		spec = ['float-thresh-neg', low, zero, min + zone / 2.0, max - zone];
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
		zone;

	if (!isNumber(maxVal) || !isNumber(minVal)) {
		return ['no-data'];
	}

	if ((origin != null) && (thresh != null) && (max != null))  { //custom setting
		spec = ['trend-amplitude', low, white, high, origin, thresh, max];
	} else {
		absmax = Math.max(-minVal, maxVal);
		zone = absmax / 4.0;
		spec = ['trend-amplitude', low, white, high,
			 0, prec2(zone / 2.0), prec2(absmax / 2.0)];
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
	defaultColorClass
};
