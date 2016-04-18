// Pick color scales based on metadata

/*global require: false, module: false */
'use strict';

var _ = require('underscore');
var multi = require('./multi');

var isNumber = _.isNumber;

var defaultColors = (function () {
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
	return function (dataset) {
		var {type, dataSubType} = dataset || {};
		var t = (type === 'clinicalMatrix') ?  'phenotype' : dataSubType;
		return defaults[t] || schemes.blueWhiteRed;
	};
}());

function colorRangeType(column) {
	return column.valueType === 'coded' ? 'coded' :
		(column.fieldType === 'clinical' ? 'float' : 'floatGenomicData');
}

var colorRange = multi(colorRangeType);

function colorFloat(column, settings, codes, data, dataset) {
	var values = data,
		max = _.maxnull(values),
		[low, zero, high] = defaultColors(dataset),
		spec,
		min;

	if (!isNumber(max)) {
		return ['no-data'];
	}
	min = _.minnull(values);
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

function colorFloatGenomicData(column, settings = {}, codes, data, dataset) {
	var values = data,
		[low, zero, high] = defaultColors(dataset),
		min = settings.min || _.minnull(values),
		max = settings.max ||  _.maxnull(values),
		minStart = settings.minStart,
		maxStart = settings.maxStart,
		spec,
		mid,
		absmax,
		zone;

	if (!isNumber(max) || !isNumber(min)) {
		return ['no-data'];
	}

	if ((settings.min !== undefined) && (settings.min !== null) && !isNaN(settings.min)) { //custom setting
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

module.exports =  {
	colorSpec: colorRange,
	defaultColors: defaultColors,
};
