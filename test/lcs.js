/*global require: false, it: false, console: false, describe: false, mocha: false */
var lcs = require('../js/lcs');

var assert = require('assert');

describe('lcs', () => {
	it('should match prefix', () => {
		assert.equal(lcs('foo', 'fo'), 2);
	});
	it('should match suffix', () => {
		assert.equal(lcs('foo', 'oo'), 2);
	});
	it('should match infix', () => {
		assert.equal(lcs('foo', 'bazfoobar'), 3);
	});
	it('should match equal', () => {
		assert.equal(lcs('baz', 'baz'), 3);
	});
	it('should handle empty string', () => {
		assert.equal(lcs('foo', ''), 0);
	});
	it('should match non-contiguous', () => {
		assert.equal(lcs('baz', 'zbzfaooz'), 3);
	});
});

