/*global describe: false, it: false, require: false */
"use strict";
var el = require('../js/exonLayout');
var assert = require('assert');
var _ = require('underscore');

var j = JSON.stringify;

describe.only('exonLayout', function () {
	describe('#pad', function () {
		it('should pad between intervals', function() {
			assert.deepEqual(el.pad(2, [[20, 30], [40, 50], [60, 70]]),
					[[20, 32], [38, 52], [58, 70]]);
		});
	});
	describe('#chromRangeFromScreen, ppb < 1', function () {
		// c |11|12|13|14|15|
		// p | 10 | 11 | 12 |
		// pixels per base 3 / 5 < 1
		var layout = {
			chrom: [[11, 15]],
			screen: [[10, 13]],
			reversed: false
		};
		it('should return first chrom position under pixel', function () {
			var res = _.range(3).map(i => el.chromRangeFromScreen(layout, 10 + i, 12)),
				exp = [[11, 15], [12, 15], [14, 15]];
			assert.deepEqual(res, exp, `first chrom positions ${j(res)}, expected ${j(exp)}`);
		});
		it('should return last chrom position under pixel', function () {
			var res = _.range(3).map(i => el.chromRangeFromScreen(layout, 10, 10 + i)),
				exp = [[11, 12], [11, 14], [11, 15]];
			assert.deepEqual(res, exp, `last chrom positions ${j(res)}, expected ${j(exp)}`);
		});
	}),
	describe('#chromRangeFromScreen, ppb < 1, reversed', function () {
		// c |15|14|13|12|11|
		// p | 10 | 11 | 12 |
		// pixels per base 3 / 5 < 1
		var layout = {
			chrom: [[11, 15]],
			screen: [[10, 13]],
			reversed: true
		};
		it('should return first chrom position under pixel', function () {
			var res = _.range(3).map(i => el.chromRangeFromScreen(layout, i + 10, 12)),
				exp = [[11, 15], [11, 14], [11, 12]];
			assert.deepEqual(res, exp, `first chrom positions ${j(res)}, expected ${j(exp)}`);
		});
		it('should return last chrom position under pixel', function () {
			var res = _.range(3).map(i => el.chromRangeFromScreen(layout, 10, i + 10)),
				exp = [[14, 15], [12, 15], [11, 15]];
			assert.deepEqual(res, exp, `last chrom positions ${j(res)}, expected ${j(exp)}`);
		});
	}),
	describe('#chromRangeFromScreen, ppb > 1', function () {
		// c | 1  |  2 |  3 |
		// p | 0| 1| 2| 3| 4|
		// pixels per base 5 / 3 > 1
		var layout = {
			chrom: [[1, 3]],
			screen: [[0, 5]],
			reversed: false
		};
		it('should return first chrom position under pixel', function () {
			var res = _.range(5).map(i => el.chromRangeFromScreen(layout, i, 4)),
				exp = [[1, 3], [1, 3], [2, 3], [2, 3], [3, 3]];
			assert.deepEqual(res, exp, `first chrom positions ${j(res)}, expected ${j(exp)}`);
		});
		it('should return last chrom position under pixel', function () {
			var res = _.range(5).map(i => el.chromRangeFromScreen(layout, 0, i)),
				exp = [[1, 1], [1, 2], [1, 2], [1, 3], [1, 3]];
			assert.deepEqual(res, exp, `last chrom positions ${j(res)}, expected ${j(exp)}`);
		});
	}),
	describe('#chromRangeFromScreen, ppb > 1, reversed', function () {
		// c | 3  |  2 |  1 |
		// p | 0| 1| 2| 3| 4|
		// pixels per base 5 / 3 > 1
		var layout = {
			chrom: [[1, 3]],
			screen: [[0, 5]],
			reversed: true
		};
		it('should return first chrom position under pixel', function () {
			var res = _.range(5).map(i => el.chromRangeFromScreen(layout, i, 4)),
				exp = [[1, 3], [1, 3], [1, 2], [1, 2], [1, 1]];
			assert.deepEqual(res, exp, `first chrom positions ${j(res)}, expected ${j(exp)}`);
		});
		it('should return last chrom position under pixel', function () {
			var res = _.range(5).map(i => el.chromRangeFromScreen(layout, 0, i)),
				exp = [[3, 3], [2, 3], [2, 3], [1, 3], [1, 3]];
			assert.deepEqual(res, exp, `last chrom positions ${j(res)}, expected ${j(exp)}`);
		});
	}),
	describe('#chromPositionFromScreen, ppb > 1', function () {
		// c | 1  |  2 |  3 |
		// p | 0| 1| 2| 3| 4|
		// pixels per base 5 / 3 > 1
		var layout = {
			chrom: [[1, 3]],
			screen: [[0, 5]],
			reversed: false
		};
		it('should return chrom position under pixel', function () {
			var res = _.range(5).map(i => el.chromPositionFromScreen(layout, i)),
				exp = [1, 2, 2, 3, 3];
			assert.deepEqual(res, exp, `first chrom positions ${j(res)}, expected ${j(exp)}`);
		});
	}),
	describe('#layout', function () {
		it('should layout intervals', function() {
			assert.deepEqual(el.layout({
				chrom: 'chr1',
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
				chromName: 'chr1',
				zoom: {start: -100, end: 510}
			});
		});
		it('should layout reversed intervals', function() {
			assert.deepEqual(el.layout({
				chrom: 'chr2',
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
				chromName: 'chr2',
				zoom: {start: -100, end: 510}
			});
		});
//		// an asymmetric case
		it('should layout reversed asym intervals', function() {
			assert.deepEqual(el.layout({
				chrom: 'chr3',
				exonStarts: [100, 200],
				exonEnds: [110, 220],
				strand: '-'
			}, 4380, {start: -100, end: 420}), {
				chrom: [[197, 420], [-100, 113]],
				screen: [[0, 2240], [2240, 4380]],
				reversed: true,
				baseLen: 11 + 21 + 3 * 2 + 200 * 2,
				pxLen: 4380,
				chromName: 'chr3',
				zoom: {start: -100, end: 420}
			});
		});
	});
});
