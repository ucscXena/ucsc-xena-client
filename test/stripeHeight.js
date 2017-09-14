/*global it: false, describe: false, mocha: false */
'use strict';
var {stripeHeight} = require('../js/drawSamples');

var assert = require('assert');

describe('stripeHeight', () => {
	it('should return 5 for (100, 200, 1000)', () => {
		assert.equal(5, stripeHeight(100, 200, 1000));
	});
	it('should return 5 for (100, 200, 500)', () => {
		assert.equal(5, stripeHeight(100, 200, 500));
	});
	it('should return 50 for (100, 200, 100)', () => {
		assert.equal(50, stripeHeight(100, 200, 100));
	});
	it('should return 500 for (100, 200, 10)', () => {
		assert.equal(500, stripeHeight(100, 200, 10));
	});
});

