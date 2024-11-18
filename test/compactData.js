/*global it: false, describe: false */

var assert = require('assert');
var jv = require('jsverify');
var {compactState, expandState} = require('../js/compactData');

var {number, record, array, uint32, nat} = jv;

var opts = {
	tests: 1000
};

// like jv.property, but set global options
function property(name, ...args) {
    var prop = jv.forall(...args);
    it(name, function () {
      return jv.assert(prop, opts);
    });
}

describe('compactData', function () {
	describe('compactState', function () {
		var segment = record({
				start: uint32,
				end: uint32,
				sample: nat,
				value: number
			}),
			rows = array(segment);
		property('expandState(compactState(x)) is identity',
			rows, function (rows) {
				var spreadsheet = {
					columns: {
						a: {fieldType: 'segmented'},
						b: {fieldType: 'blah'}
					},
					data: {
						a: {
							foo: 'bar',
							req: {
								ack: 'baz',
								rows: rows
							}
						},
						b: {
							foo: 'bar',
							req: {
								ack: 'baz',
								rows: [1, 2, 3]
							}
						}
					}
				}, state = {spreadsheet};
				assert.deepEqual(state, expandState(null, compactState(state)));
				return true;
			});
	});
});
