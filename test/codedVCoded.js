/*global describe: false, it: false */
var codedVCoded = require('../js/chart/codedVCoded');
var assert = require('assert');

describe('codedVCoded', function () {
	describe('#getCodedMatrices', function () {
		// observed[yIdx][xIdx]: 2 Y categories × 2 X categories
		// X=0 has 40 total, X=1 has 60 total
		var observed = [
				[10, 20],  // Y=0: 10 in X=0, 20 in X=1
				[30, 40],  // Y=1: 30 in X=0, 40 in X=1
			],
			xMargin = [40, 60];

		it('countMatrix should be the transpose of observed', function () {
			var {countMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'column'});
			assert.deepEqual(countMatrix, [
				[10, 30],  // X=0: counts across Y categories
				[20, 40],  // X=1: counts across Y categories
			]);
		});
		it("'column': each xIdx group (each pctMatrix row) sums to 1", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'column'});
			pctMatrix.forEach((row, i) => {
				var sum = row.reduce((a, b) => a + b, 0);
				assert.ok(Math.abs(sum - 1) < 1e-10, `row ${i} sums to ${sum}, expected 1`);
			});
		});
		it("'column': correct values", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'column'});
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 40) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 40) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 60) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 60) < 1e-10);
		});
		it("'row': each yIdx group (each pctMatrix column) sums to 1", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'row'});
			var nCols = pctMatrix[0].length;
			for (var j = 0; j < nCols; j++) {
				var sum = pctMatrix.reduce((a, row) => a + row[j], 0);
				assert.ok(Math.abs(sum - 1) < 1e-10, `column ${j} sums to ${sum}, expected 1`);
			}
		});
		it("'row': correct values", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'row'});
			// Y=0 margin = 10+20 = 30, Y=1 margin = 30+40 = 70
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 30) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 70) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 30) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 70) < 1e-10);
		});
		it("'total': all values should sum to 1", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'total'});
			var sum = pctMatrix.flat().reduce((a, b) => a + b, 0);
			assert.ok(Math.abs(sum - 1) < 1e-10, `total sums to ${sum}, expected 1`);
		});
		it("'total': correct values", function () {
			var {pctMatrix} = codedVCoded.getCodedMatrices({observed, xMargin, shareOf: 'total'});
			// total = 40 + 60 = 100
			assert.ok(Math.abs(pctMatrix[0][0] - 10 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[0][1] - 30 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][0] - 20 / 100) < 1e-10);
			assert.ok(Math.abs(pctMatrix[1][1] - 40 / 100) < 1e-10);
		});
		it("'column': zero margin produces NaN", function () {
			var obs = [[0, 5], [3, 4]],
				margin = [0, 9],
				{pctMatrix} = codedVCoded.getCodedMatrices({observed: obs, xMargin: margin, shareOf: 'column'});
			assert.ok(isNaN(pctMatrix[0][0]));
			assert.ok(isNaN(pctMatrix[0][1]));
		});
		it("'row': zero margin produces NaN", function () {
			var obs = [[0, 0], [3, 4]],
				margin = [3, 4],
				{pctMatrix} = codedVCoded.getCodedMatrices({observed: obs, xMargin: margin, shareOf: 'row'});
			// Y=0 margin = 0+0 = 0, so column 0 of pctMatrix should be NaN
			assert.ok(isNaN(pctMatrix[0][0]));
			assert.ok(isNaN(pctMatrix[1][0]));
		});
		it("'total': zero total produces NaN", function () {
			var obs = [[0, 0], [0, 0]],
				margin = [0, 0],
				{pctMatrix} = codedVCoded.getCodedMatrices({observed: obs, xMargin: margin, shareOf: 'total'});
			pctMatrix.forEach(row => row.forEach(v => assert.ok(isNaN(v))));
		});
		it('empty observed returns empty matrices', function () {
			var {countMatrix, pctMatrix} = codedVCoded.getCodedMatrices({observed: [], xMargin: [], shareOf: 'column'});
			assert.deepEqual(countMatrix, []);
			assert.deepEqual(pctMatrix, []);
		});
	});
});
