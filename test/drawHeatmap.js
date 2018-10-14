/*global describe: false, it: false, require: false */
'use strict';
var assert = require('assert');
//var _ = require('../js/underscore_ext');

var {tallyDomains} = require('../js/drawHeatmap');


describe('drawHeatmap', function () {
    describe('#tallyDomains', function () {
        it('should tally slice', function() {
			var d = [1, 1, 1, 5, 5, 7],
				start = 0,
				end = d.length,
				domains = [0, 3, 6],
				tally = tallyDomains(d, start, end, domains);

			assert.deepEqual([
				{count: 0, sum: 0},
				{count: 3, sum: 3},
				{count: 2, sum: 10},
				{count: 1, sum: 7},
			], tally);
			tally = tallyDomains(d, start + 1, end - 1, domains);
			assert.deepEqual([
				{count: 0, sum: 0},
				{count: 2, sum: 2},
				{count: 2, sum: 10},
				{count: 0, sum: 0},
			], tally);
        });
	});
});
