/*global it: false, describe: false, mocha: false */
'use strict';
var {stripeHeight} = require('../js/drawSamples');

var assert = require('assert');

describe('stripeHeight', () => {
	it('should return 1 for (100, 200, 1000)', () => {
		assert.equal(1, stripeHeight(100, 200, 1000));
	});
	it('should return 5 for (100, 200, 500)', () => {
		assert.equal(5, stripeHeight(100, 200, 500));
	});
	it('should return 10 for (100, 200, 100)', () => {
		assert.equal(10, stripeHeight(100, 200, 100));
	});
	it('should return 100 for (100, 200, 10)', () => {
		assert.equal(100, stripeHeight(100, 200, 10));
	});
});

