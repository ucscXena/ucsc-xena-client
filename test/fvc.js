/*global describe: false, it: false */
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
		it('should have correct values in totalMatrix for singleCell mode', function () {
			var yexpression = 'singleCell',
				ynonexpressed = applyExpression(ydata, yexpression),
				exp = [[2, 2], [3, 3], [5, 5], [6, 6]],
				res = fvc.getMatrices({ydata, groups, yexpression, ynonexpressed});
			assert.deepEqual(res.totalMatrix, exp);
		});
	});
	describe('#getCodedMatrices', function () {
		// observed[yIdx][xIdx]: 2 Y categories × 2 X categories
		// X=0 has 40 total, X=1 has 60 total
		var observed = [
				[10, 20],  // Y=0: 10 in X=0, 20 in X=1
				[30, 40],  // Y=1: 30 in X=0, 40 in X=1
			],
			xMargin = [40, 60];

		it('countMatrix should be the transpose of observed', function () {
			var {countMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'bulk'});
			assert.deepEqual(countMatrix, [
				[10, 30],  // X=0: counts across Y categories
				[20, 40],  // X=1: counts across Y categories
			]);
		});
		it('row percentage: each row should sum to 1', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'bulk'});
			pctMatrix.forEach((row, i) => {
				var sum = row.reduce((a, b) => a + b, 0);
				assert.ok(Math.abs(sum - 1) < 1e-10, `row ${i} sums to ${sum}, expected 1`);
			});
		});
		it('row percentage: correct values', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'bulk'});
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 40) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 40) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 60) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 60) < 1e-10);
		});
		it('column percentage: each column should sum to 1', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'column'});
			var nCols = pctMatrix[0].length;
			for (var j = 0; j < nCols; j++) {
				var sum = pctMatrix.reduce((a, row) => a + row[j], 0);
				assert.ok(Math.abs(sum - 1) < 1e-10, `column ${j} sums to ${sum}, expected 1`);
			}
		});
		it('column percentage: correct values', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'column'});
			// Y=0 margin = 10+20 = 30, Y=1 margin = 30+40 = 70
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 30) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 70) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 30) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 70) < 1e-10);
		});
		it('total percentage: all values should sum to 1', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'singleCell'});
			var sum = pctMatrix.flat().reduce((a, b) => a + b, 0);
			assert.ok(Math.abs(sum - 1) < 1e-10, `total sums to ${sum}, expected 1`);
		});
		it('total percentage: correct values', function () {
			var {pctMatrix} = fvc.getCodedMatrices({observed, xMargin, yexpression: 'singleCell'});
			// total = 40 + 60 = 100
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 100) < 1e-10);
		});
		it('row percentage: zero margin produces NaN', function () {
			var obs = [[0, 5], [3, 4]],
				margin = [0, 9],
				{pctMatrix} = fvc.getCodedMatrices({observed: obs, xMargin: margin, yexpression: 'bulk'});
			assert.ok(isNaN(pctMatrix[0][0]));
			assert.ok(isNaN(pctMatrix[0][1]));
		});
		it('column percentage: zero column margin produces NaN', function () {
			var obs = [[0, 0], [3, 4]],
				margin = [3, 4],
				{pctMatrix} = fvc.getCodedMatrices({observed: obs, xMargin: margin, yexpression: 'column'});
			// Y=0 margin = 0+0 = 0, so column 0 of pctMatrix should be NaN
			assert.ok(isNaN(pctMatrix[0][0]));
			assert.ok(isNaN(pctMatrix[1][0]));
		});
		it('total percentage: zero total produces NaN', function () {
			var obs = [[0, 0], [0, 0]],
				margin = [0, 0],
				{pctMatrix} = fvc.getCodedMatrices({observed: obs, xMargin: margin, yexpression: 'singleCell'});
			pctMatrix.forEach(row => row.forEach(v => assert.ok(isNaN(v))));
		});
		it('empty observed returns empty matrices', function () {
			var {countMatrix, pctMatrix} = fvc.getCodedMatrices({observed: [], xMargin: [], yexpression: 'bulk'});
			assert.deepEqual(countMatrix, []);
			assert.deepEqual(pctMatrix, []);
		});
	});
});
