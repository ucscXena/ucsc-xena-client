/*global describe: false, it: false, require: false */
var _ = require('../js/underscore_ext').default;
var fvc = require('../js/chart/fvc');
const {applyExpression} = require('../js/chart/singleCell');
var assert = require('assert');

describe('fvc', function () {
	var ydata = [[1, 2, 3, 4, 0, 0, 9, 0, 22, 50, 12, 2, 44, 10, 0, 8, 22], [11, 3, 8, 10, 9, 9, 8, 12, 12, 5, 2, 1, 4, 0, 1, 8, 3]],
		groups = [[0, 1], [2, 3, 5], [4, 7, 8, 9, 10], [6, 11, 12, 13, 14, 15]],
		yexpression = 'bulk',
		ynonexpressed = new Map();
	describe('#getMatrices', function () {
		it('should handle empty data correctly for nNumberMatrix', function () {
			var ydata = [[], []],
				res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});
			assert.deepEqual(res.nNumberMatrix, [[0, 0], [0, 0], [0, 0], [0, 0]]);
		});
		it('should handle empty data correctly for other matrices', function () {
			var ydata = [[], []],
				res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed}),
				matrices = _.omit(res, ['nNumberMatrix']);
			Object.values(matrices).forEach((matrix) => matrix.forEach((row) => row.forEach((v) => assert(isNaN(v)))));
		});
		it('should return matrices with correct dimensions', function () {
			var res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});
			Object.values(res).forEach((matrix) => {
				assert.equal(matrix.length, groups.length);
				assert.equal(matrix[0].length, ydata.length);
			});
		});
		it('should have NaN values in detectionMatrix and expressionMatrix for bulk mode', function () {
			var res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed}),
				matrices = _.pick(res, ['detectionMatrix', 'expressionMatrix']);
			Object.values(matrices).forEach((matrix) => matrix.forEach(row => row.forEach(v => assert(isNaN(v)))));
		});
		it('should have correct values in expressionMatrix for singleCell mode', function () {
			var yexpression = 'singleCell',
				ynonexpressed = applyExpression(ydata, yexpression),
				exp = [[1.5, 7], [3.5, 9], [28, 8], [14.6, 4.4]],
				res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});
			assert.deepEqual(res.expressionMatrix, exp);
		});
		it('should have correct values in detectionMatrix for singleCell mode', function () {
			var yexpression = 'singleCell',
				ynonexpressed = applyExpression(ydata, yexpression),
				exp = [[1, 1], [2 / 3, 1], [3 / 5, 1], [5 / 6, 5 / 6]],
				res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});
			assert.deepEqual(res.detectionMatrix, exp);
		});
	});
});
