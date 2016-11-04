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
			}, 4450, {start: -100, end: 510}), {
				chrom: [[-100, 113], [197, 213], [297, 510]],
				screen: [[0, 2140], [2140, 2310], [2310, 4450]],
				reversed: false,
				/* 3 intvls of 11, 2 pads of 200, 4 intronic buffers */
				baseLen: 11 * 3 + 200 * 2 + 3 * 4,
				pxLen: 4450,
				zoom: {start: -100, end: 510}
			});
		});
		it('should layout reversed intervals', function() {
			assert.deepEqual(el.layout({
				exonStarts: [100, 200, 300],
				exonEnds: [110, 210, 310],
				strand: '-'
			}, 4450, {start: -100, end: 510}), {
				chrom: [[297, 510], [197, 213], [-100, 113]],
				screen: [[0, 2140], [2140, 2310], [2310, 4450]],
				reversed: true,
				/* 3 intvls of 11, 2 pads of 200, 4 intronic buffers */
				baseLen: 11 * 3 + 200 * 2 + 3 * 4,
				pxLen: 4450,
				zoom: {start: -100, end: 510}
			});
		});
//		// an asymmetric case
		it('should layout reversed asym intervals', function() {
			assert.deepEqual(el.layout({
				exonStarts: [100, 200],
				exonEnds: [110, 220],
				strand: '-'
			}, 4380, {start: -100, end: 420}), {
				chrom: [[197, 420], [-100, 113]],
				screen: [[0, 2240], [2240, 4380]],
				reversed: true,
				baseLen: 11 + 21 + 3 * 2 + 200 * 2,
				pxLen: 4380,
				zoom: {start: -100, end: 420}
			});
		});
	});
});
