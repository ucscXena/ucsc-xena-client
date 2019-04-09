/*global describe: false, it: false, require: false, assert: false */
"use strict";

var assert = require('assert');
var {colorSpec} = require('../js/heatmapColors');
var {colorScale} = require('../js/colorScales');
var _ = require('underscore');
var xenaWasm = require('../js/xenaWasm');
var jsc = require('jsverify');

// Types of color scales
//
// ['float-pos', low, high, min, max]
// ['float-neg', low, high, min, max]
// ['float', low, zero, high, min, max]
// ['float-pos-threshold', zero, high, min, thresh, max]
// ['float-neg-threshold', low, zero, min, thresh, max]
// ['float-threshold', low, zero, high, min, min-thresh, max-thresh, max]
// ['ordinal', count]
//
var red = '#ff0000';
var white = '#ffffff';
var blue = '#0000ff';

//var RED = 0, GREEN = 1, BLUE = 2, VALUE = 3;
var color = jsc.tuple([jsc.uint8, jsc.uint8, jsc.uint8]);

var toPos = x => x.map(v => v < 0 ? -v : v);
var suchthatDistinct = a =>
	jsc.suchthat(a, v => v.length === _.uniq(v).length);
var suchthatPosDistinct = a =>
	jsc.suchthat(a, v => v.length === _.uniq(toPos(v)).length);

var twoStop = jsc.record({
	domain: suchthatDistinct(jsc.tuple([jsc.number, jsc.number])),
	range: jsc.tuple([color, color])
});

var threeStop = jsc.record({
	domain: jsc.suchthat(jsc.tuple([jsc.number, jsc.number]),
				([l, h]) => l !== 0 && h !== 0),
	range: jsc.tuple([color, color, color])
});

var fourStop = jsc.record({
	domain: suchthatDistinct(jsc.tuple([jsc.number, jsc.number, jsc.number, jsc.number])),
	range: jsc.tuple([color, color, color])
});

var logStop = jsc.record({
	domain: suchthatPosDistinct(jsc.tuple([jsc.number, jsc.number])),
	range: jsc.tuple([color, color])
});

//var fourStop = jsc.tuple([colorStop, colorStop, colorStop, colorStop]);

var rgbArray = rgb => [(rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff];

describe.only('wasmColor', function () {
	describe('#wasmColor', function () {
		it('should return value', function () {
			var rgb = xenaWasm.getColorLinear([0, 1], [[0, 0, 0], [255, 255, 255]], 0.5);
			var r = rgb & 0xff;
			var g = (rgb >> 8) & 0xff;
			var b = (rgb >> 16) & 0xff;
			assert(r === 128);
			assert(g === 128);
			assert(b === 128);
		});
	});
	jsc.property('matches js two stop scales', twoStop, jsc.number,
		function(stops, value) {
			var domain = _.sortBy(stops.domain, x => x);
			var range = stops.range;
			var fp = colorScale(['float-pos', ...range, ...domain]);
			var fn = colorScale(['float-neg', ...range, ...domain]);
			var c0 = rgbArray(xenaWasm.getColorLinear(domain, range, value));
			var c1 = fp.rgb(value);
			var c2 = fn.rgb(value);
			assert.deepEqual(c0, c1);
			assert.deepEqual(c0, c2);
			return true;
	});
	jsc.property('matches js three stop scales', threeStop, jsc.number,
		function(stops, value) {
			var domainIn = stops.domain;
			var m = Math.max(Math.abs(domainIn[0]), Math.abs(domainIn[1]));
			var domain = [-m, 0, m];
			var range = stops.range;
			var f = colorScale(['float', ...range, ...domain]);
			var c0 = rgbArray(xenaWasm.getColorLinear(domain, range, value));
			var c1 = f.rgb(value);
			assert.deepEqual(c0, c1);
			return true;
	});
	var setPrecision = x => parseFloat(x.toPrecision(2));
	jsc.property('matches js four stop scales', fourStop, jsc.number,
		function(stops, value) {
			var {domain: domainUnsorted, range: [low, zero, high]} = stops;
			var domain = _.sortBy(domainUnsorted, x => x).map(setPrecision);
			var f = colorScale(['float-thresh', low, zero, high, ...domain]);
			var fullRange = [low, zero, zero, high];
			var c0 = rgbArray(xenaWasm.getColorLinear(domain, fullRange, value));
			var c1 = f.rgb(value);
			assert.deepEqual(c0, c1);
			return true;
	});
	jsc.property('matches js log scales', logStop, jsc.number,
		function(stops, value) {
			var domain = _.sortBy(toPos(stops.domain), x => x);
			var range = stops.range;
			var f = colorScale(['float-log', ...range, ...domain]);
			var c0 = rgbArray(xenaWasm.getColorLog(domain, range, value));
			var c1 = f.rgb(value);
			assert.deepEqual(c0, c1);
			return true;
	});
});
describe('heatmapColors', function () {
	describe('#colorScale', function () {
		it('should return positive linear scale', function() {
			var scale = colorScale(['float-pos', 'red', 'white', 1, 3]);
			assert.deepEqual([1, 3], scale.domain());
			assert.deepEqual(['red', 'white'], scale.range());
			assert.deepEqual(red, scale(1));
			assert.deepEqual(white, scale(3));
			assert.equal(scale(undefined), undefined);
		});
		it('should return negative linear scale', function() {
			var scale = colorScale(['float-neg', 'red', 'white', -3, -1]);
			assert.deepEqual([-3, -1], scale.domain());
			assert.deepEqual(['red', 'white'], scale.range());
			assert.deepEqual(red, scale(-3));
			assert.deepEqual(white, scale(-1));
			assert.equal(scale(undefined), undefined);
		});
		it('should return linear scale', function() {
			var scale = colorScale(['float', 'red', 'white', 'blue', -3, 1]);
			assert.deepEqual([-3, 0, 3], scale.domain());
			assert.deepEqual(['red', 'white', 'blue'], scale.range());
			assert.deepEqual(red, scale(-3));
			assert.deepEqual(white, scale(0));
			assert.deepEqual(blue, scale(3));
			assert.equal(scale(undefined), undefined);
		});
		it('should return positive linear thresholded scale', function() {
			var scale = colorScale(['float-thresh-pos', 'white', 'red', 1.5, 3]);
			assert.deepEqual([1.5, 3], scale.domain());
			assert.deepEqual(['white', 'red'], scale.range());
			assert.deepEqual(white, scale(1));
			assert.deepEqual(white, scale(1.5));
			assert.deepEqual(red, scale(3));
			assert.equal(scale(undefined), undefined);
		});
		it('should return negative linear thresholded scale', function() {
			var scale = colorScale(['float-thresh-neg', 'red', 'white', -3, -1.5]);
			assert.deepEqual([-3, -1.5], scale.domain());
			assert.deepEqual(['red', 'white'], scale.range());
			assert.deepEqual(red, scale(-3));
			assert.deepEqual(white, scale(-1.5));
			assert.deepEqual(white, scale(-1));
			assert.equal(scale(undefined), undefined);
		});
		it('should return linear thresholded scale', function() {
			var scale = colorScale(['float-thresh', 'red', 'white', 'blue',
				-3, -0.5, 0.5,  1]);
			assert.deepEqual([-3, -0.5, 0.5, 1], scale.domain());
			assert.deepEqual(['red', 'white', 'white', 'blue'], scale.range());
			assert.deepEqual(red, scale(-3));
			assert.deepEqual(white, scale(-0.5));
			assert.deepEqual(white, scale(0.5));
			assert.deepEqual(blue, scale(1));
			assert.equal(scale(undefined), undefined);
		});
		it('should return category19', function() {
			var scale = colorScale(['ordinal', 12]),
				range = _.uniq(_.range(12).map(scale));
			assert.equal(12, range.length);
			assert.equal(scale(undefined), undefined);
		});
	});
	describe('#colorSpec', function () {
		it('should return linear scales for clinical float', function() {
			var column = {fieldType: 'clinical', colorClass: 'clinical'},
				dataset = {type: 'clinicalMatrix'},
				settings = {}, codes = null;

			// positive data
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: 1, b: 2, c: 3}}, dataset),
				['float-pos', '#ffffff', '#ff0000', 1, 3]);
			// negative data
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: -1, b: -2, c: -3}}, dataset),
				['float-neg', '#0000ff',  '#ffffff', -3, -1]);
			// neg-pos data
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: -1, b: -2, c: 3}}, dataset),
				['float', '#0000ff', '#ffffff', '#ff0000', -2, 3]);
		});
		it('should return ordinal scale for clinical category', function() {
			var column = {fieldType: 'clinical', valueType: 'coded'},
				settings = null,
				codes = ['A', 'B', 'C', 'D'];

			assert.deepEqual(colorSpec(column, settings, codes,
					{a: 1, b: 2, c: 3}),
				['ordinal', 4, undefined]);
		});
		it('should return linear thresholded scales for genomic data', function() {
			var column = {fieldType: 'probes', colorClass: 'expression'},
				dataset = {type: 'genomicMatrix', dataSubType: 'gene expression'},
				settings, codes;

			// positive data
			// Threshold is 1/4 from bottom -> zero, 1/8 from top -> high
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: 0, b: 2, c: 24}}, dataset),
				['float-thresh-pos', '#000000', '#ff0000', 6, 21]);
			// negative data
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: 0, b: -2, c: -24}}, dataset),
				['float-thresh-neg', '#00ff00',  '#000000', -21, -6]);
			// neg-pos data
			assert.deepEqual(colorSpec(column, settings, codes,
					{values: {a: -8, b: -2, c: 24}}, dataset),
				['float-thresh', '#00ff00', '#000000', '#ff0000', -12, -3, 3, 12]);
		});
		it('should return linear thresholded scales for custom setting', function() {
			var dataset = {type: 'genomicMatrix', dataSubType: 'gene expression'},
				column = {fieldType: 'probes', colorClass: 'expression'},
				settings1 = {
					min: -12,
					minstart: -11,
					maxstart: 6,
					max: 7
				},
				settings2 = {
					min: -8,
					max: 16
				},
				codes;

			assert.deepEqual(colorSpec(column, settings1, codes,
					{a: NaN, b: NaN, c: NaN}, dataset),
				['float-thresh', '#00ff00', '#000000', '#ff0000', -12, -11, 6, 7]);
			// negative data
			assert.deepEqual(colorSpec(column, settings2, codes,
					{a: NaN, b: NaN, c: NaN}, dataset),
				['float-thresh', '#00ff00',  '#000000', '#ff0000', -8, 1, 7, 16]);
		});
	});
});
