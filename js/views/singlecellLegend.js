// singlecell legend

import Legend from './Legend.js';

import BandLegend from './BandLegend.js';
import {el, span} from '../chart/react-hyper';
import {colorScale} from '../colorScales';
import {cmpCodes} from '../models/singlecell';
var {first, get, last, Let} = require('../underscore_ext').default;

var legend = el(Legend);
var bandLegend = el(BandLegend); //eslint-disable-line no-unused-vars

function codedLegend({column: {color, codes, codesInView}, onClick}) {
	var colorFn = colorScale(color),
		data = codesInView.sort(cmpCodes(codes)),
		colors = data.map(colorFn),
		labels = data.map(d => codes[d]);

	return legend({colors, codes: data, labels, titles: labels, onClick, max: Infinity,
		inline: true});
}

// might want to use <wbr> here, instead, so cut & paste work better, but that
// will require a recursive split/flatmap to inject the <wbr> elements.
var addWordBreaks = str => str.replace(/([_/])/g, '\u200B$1\u200B');

var isLog = scale => get(scale, 0, '').indexOf('log') !== -1,
	pow2m1 = x => Math.pow(2, x) - 1,
	log2p1 = x => Math.log2(x + 1);

var logSampler = (min, max, scale) =>
	Let((lm = log2p1(min), m = (log2p1(max) - lm) / (max - min)) =>
			 x => Let((xl = (x - min) * m + lm) => scale.rgb(pow2m1(xl))));

function floatLegend({column: {color, units}}) {
	var scale = colorScale(color),
		values = scale.domain(),
		footnotes = units && units[0] ?
			[span({title: units[0]}, addWordBreaks(units[0]))] : null,
		min = first(values),
		max = last(values),
		lscale = isLog(color) ? {rgb: logSampler(min, max, scale)} : scale;
	return bandLegend({
		range: {min, max},
		colorScale: lscale,
		footnotes,
		width: 50,
		height: 20
	});
}

export default props =>
	(props.column.valueType === 'coded' ?
		codedLegend : floatLegend)(props);
