/*global describe: false, it: false, require: false, assert: false */
"use strict";

var assert = require('assert');
var {colorSpec} = require('../js/heatmapColors');
var {colorScale} = require('../js/colorScales');
var _ = require('underscore');

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
