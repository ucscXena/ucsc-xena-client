// Pick color scales based on metadata

/*global require: false, module: false */
'use strict';

var _ = require('underscore');
var multi = require('./multi');

var isNumber = _.isNumber;

var blueWhiteRed = ['#0000ff', '#ffffff', '#ff0000'],
	greenBlackRed = ['#00ff00', '#000000', '#ff0000'];
	//greenBlackYellow = ['#007f00', '#000000', '#ffff00'];

var defaultColors = {
	'expression': greenBlackRed,
	'clinical': blueWhiteRed, //greenBlackYellow,
	'default': blueWhiteRed
};

var subTypeClass = ({dataSubType}) =>
	dataSubType.indexOf('expression') !== -1 ? 'expression' : 'default';

var typeClass = {
	clinicalMatrix: () => 'clinical',
	mutationVector: () => 'mutation'
};

var defaultColorClass = dataset => (typeClass[dataset.type] || subTypeClass)(dataset);

function colorRangeType(column) {
	return column.valueType === 'coded' ? 'coded' :
		(column.fieldType === 'clinical' ? 'float' : 'floatGenomicData');
}

var colorRange = multi(colorRangeType);

function colorFloat({colorClass}, settings = {}, codes, data) {
	var values = data,
		[low, zero, high] = defaultColors[colorClass],
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

function colorCoded(column, settings, codes) {
	return ['ordinal', codes.length];
}

function colorFloatGenomicData({colorClass}, settings = {}, codes, data) {
	var values = data,
		[low, zero, high] = defaultColors[colorClass],
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

colorRange.add('float', colorFloat);
colorRange.add('coded', colorCoded);
colorRange.add('floatGenomicData', colorFloatGenomicData);

module.exports =  {
	colorSpec: colorRange,
	defaultColors,
	defaultColorClass
};
