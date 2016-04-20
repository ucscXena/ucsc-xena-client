/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

var fieldsModel = require('../js/models/fieldData');

var assert = require('assert');

mocha.allowUncaught();

describe('fields', function () {
	describe('#concatValuesbyFieldPosition', function () {
		it('should concat single fields', function () {
			var data = [[[0, 1, 2, 3]], [[4, 5]]],
				lengths = [['s0', 's1', 's2', 's3'], ['t0', 't1']].map(s => s.length);

			assert.deepEqual(fieldsModel.concatByFieldPosition(lengths, data),
							  [[0, 1, 2, 3, 4, 5]]);
		});
		it('should concat two fields', function () {
			var data = [[[0, 1, 2, 3], ['a', 'b', 'c', 'd']], [[4, 5], ['e', 'f']]],
				lengths = [['s0', 's1', 's2', 's3'], ['t0', 't1']].map(s => s.length);

			assert.deepEqual(fieldsModel.concatByFieldPosition(lengths, data),
							  [[0, 1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e', 'f']]);
		});
		it('should concat with missing fields', function () {
			var data = [[[0, 1, 2, 3]], [[4, 5], ['e', 'f']]],
				lengths = [['s0', 's1', 's2', 's3'], ['t0', 't1']].map(s => s.length);

			assert.deepEqual(fieldsModel.concatByFieldPosition(lengths, data),
							  [[0, 1, 2, 3, 4, 5], [null, null, null, null, 'e', 'f']]);
		});
		it('should concat multiple fields', function () {
			var data = [[[0, 1, 2, 3], ['a', 'b', 'c', 'd'], [-1, -2, -3, -4]], [[4, 5], ['e', 'f'], [-5, -6]]],
				lengths = [['s0', 's1', 's2', 's3'], ['t0', 't1']].map(s => s.length);

			assert.deepEqual(fieldsModel.concatByFieldPosition(lengths, data),
							  [[0, 1, 2, 3, 4, 5], ['a', 'b', 'c', 'd', 'e', 'f'], [-1, -2, -3, -4, -5, -6]]);
		});
		it('should concat multiple cohorts', function () {
			var data = [[[0, 1, 2, 3], ['a', 'b', 'c', 'd']], [[4, 5], ['e', 'f']], [[6, 7, 8], ['g', 'h', 'i']]],
				lengths = [['s0', 's1', 's2', 's3'], ['t0', 't1'], ['u0', 'u1', 'u2']].map(s => s.length);

			assert.deepEqual(fieldsModel.concatByFieldPosition(lengths, data),
							  [[0, 1, 2, 3, 4, 5, 6, 7, 8], ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']]);
		});
	});
});
