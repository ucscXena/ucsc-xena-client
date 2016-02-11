
/*global describe: false, it: false, require: false */
"use strict";
var {findIntervals} = require('../js/refGeneExons');
var assert = require('assert');

describe('refGeneExons', function () {
	describe('#findIntervals', function () {
		it('should split on cds between intervals', function() {
			assert.deepEqual(findIntervals({
				cdsStart: 10,
				cdsEnd: 90,
				exonStarts: [1, 20, 30, 60, 80],
				exonEnds: [15, 28, 58, 73, 100]
			}), [
				{ start: 1,  end: 9,   i: 0, inCds: false},
				{ start: 10, end: 15,  i: 0, inCds: true},
				{ start: 20, end: 28,  i: 1, inCds: true},
				{ start: 30, end: 58,  i: 2, inCds: true},
				{ start: 60, end: 73,  i: 3, inCds: true},
				{ start: 80, end: 90,  i: 4, inCds: true},
				{ start: 91, end: 100, i: 4, inCds: false}
			]);
		});
	});
});
