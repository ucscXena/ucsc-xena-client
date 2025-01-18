// singlecell legend

var Legend = require('./Legend');
var BandLegend = require('./BandLegend');
import {el, span} from '../chart/react-hyper';
import {colorScale, scaleParams} from '../colorScales';
var {first, get, last, Let, range} = require('../underscore_ext').default;

var legend = el(Legend);
var bandLegend = el(BandLegend); //eslint-disable-line no-unused-vars

var cmpStr = (i, j) => i < j ? 1 : j < i ? -1 : 0;

var cmp = codes => (i, j) =>
	Let((ci = codes[i], cj = codes[j]) =>
		isNaN(ci) && isNaN(cj) ? cmpStr(ci, cj) :
		isNaN(ci) ? 1 :
		isNaN(cj) ? -1 :
		+cj - +ci);

function codedLegend({column: {color, codes}, onClick}) {
	var colorFn = colorScale(color),
		data = range(scaleParams(color)[0]).sort(cmp(codes)),
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
