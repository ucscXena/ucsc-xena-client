/*global describe: false, it: false, require: false */
"use strict";
var el = require('../js/exonLayout');
var assert = require('assert');

describe('exonLayout', function () {
	describe('#pad', function () {
		it('should pad between intervals', function() {
			assert.deepEqual(el.pad(2, [[20, 30], [40, 50], [60, 70]]),
					[[20, 32], [38, 52], [58, 70]]);
		});
	});
	describe('#layout', function () {
		it('should layout intervals', function() {
			assert.deepEqual(el.layout({
				exonStarts: [100, 200, 300],
				exonEnds: [110, 210, 310],
				strand: null
			}, 330, {len: 33}), {
				chrom: [[100, 113], [197, 213], [297, 310]],
				screen: [[0, 140], [140, 310], [310, 450]],
				reversed: false,
				baseLen: 33,
				pxLen: 330,
				zoom: {len: 33}
			});
		});
		it('should layout reversed intervals', function() {
			assert.deepEqual(el.layout({
				exonStarts: [100, 200, 300],
				exonEnds: [110, 210, 310],
				strand: '-'
			}, 330, {len: 33}), {
				chrom: [[297, 310], [197, 213], [100, 113]],
				screen: [[0, 140], [140, 310], [310, 450]],
				reversed: true,
				baseLen: 33,
				pxLen: 330,
				zoom: {len: 33}
			});
		});
		// an asymmetric case
		it('should layout reversed intervals (2)', function() {
			assert.deepEqual(el.layout({
				exonStarts: [100, 200],
				exonEnds: [110, 220],
				strand: '-'
			}, 2120, {len: 212}), {
				chrom: [[197, 220], [100, 113]],
				screen: [[0, 240], [240, 380]],
				reversed: true,
				baseLen: 212,
				pxLen: 2120,
				zoom: {len: 212}
			});
		});
	});
});
