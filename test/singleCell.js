/*global describe: false, it: false, require: false */
var sc = require('../js/chart/singleCell');
var assert = require('assert');

describe('singleCell', function () {
	describe('#applyExpression', function () {
		var data = [[1, 2, 3, 4], [-1, 0, 1, 0], [5, 6, 7, 8]];
		it('should return null for undefined mode', function () {
			var res = sc.applyExpression(data, undefined);
			assert.equal(res, null);
		});
		it('should return null for "bulk" mode', function () {
			var res = sc.applyExpression(data, 'bulk');
			assert.equal(res, null);
		});
		it('should return indices of non-expressed values for "singleCell" mode', function () {
			var res = sc.applyExpression(data, 'singleCell'),
				exp = [[], [0, 1, 3], []];
			res.forEach((r, i) => assert.deepEqual([...r], exp[i]));
		});
	});
	describe('#computeAvgExpr', function () {
		it('should return 0 for an empty array', function () {
			assert.equal(sc.computeAvgExpr([]), 0);
		});
		it('should compute the correct average for non-empty arrays', function () {
			assert.equal(sc.computeAvgExpr([1, 2, 3, 4]), 2.5);
		});
	});
	describe('#computePctExpr', function () {
		it('should return 0 when totalCount is 0', function () {
			assert.equal(sc.computePctExpr(0, 0), 0);
		});
		it('should compute the percentage of expressed cells for valid counts', function () {
			assert.equal(sc.computePctExpr(3, 10), 0.3);
		});
	});
});
