/*global it: false, describe: false, mocha: false */
'use strict';

var assert = require('assert');
var {prefixBitLimit} = require('../js/permuteCase');

describe('permuteCase', () => {
	describe('prefixBitLimit', () => {
		it('should return full string under n', () => {
			assert.equal('f', prefixBitLimit(4, 'f'));
			assert.equal('fo', prefixBitLimit(4, 'fo'));
			assert.equal('foo', prefixBitLimit(4, 'foo'));
			assert.equal('foop', prefixBitLimit(4, 'foop'));
		});
		it('should return full string under n bits', () => {
			assert.equal('f12345', prefixBitLimit(4, 'f12345'));
			assert.equal('fo12345', prefixBitLimit(4, 'fo12345'));
			assert.equal('foo12345', prefixBitLimit(4, 'foo12345'));
			assert.equal('foop12345', prefixBitLimit(4, 'foop12345'));
			assert.equal('12345f', prefixBitLimit(4, '12345f'));
			assert.equal('12345fo', prefixBitLimit(4, '12345fo'));
			assert.equal('12345foo', prefixBitLimit(4, '12345foo'));
			assert.equal('12345foop', prefixBitLimit(4, '12345foop'));
		});
		it('should trim to n case bits prefix', () => {
			assert.equal('abcd', prefixBitLimit(4, 'abcd'));
			assert.equal('abcd', prefixBitLimit(4, 'abcde'));
			assert.equal('abcd', prefixBitLimit(4, 'abcdef'));
			assert.equal('abcd', prefixBitLimit(4, 'abcdefg'));
			assert.equal('123abcd', prefixBitLimit(4, '123abcd'));
			assert.equal('123abcd', prefixBitLimit(4, '123abcde'));
			assert.equal('123abcd', prefixBitLimit(4, '123abcdef'));
			assert.equal('123abcd', prefixBitLimit(4, '123abcdefg'));
		});
	});

});
