/*global it: false, describe: false */
var assert = require('assert');
var jv = require('jsverify');
var _ = require('../js/underscore_ext');
var {pxTransformEach} = require('../js/layoutPlot');

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

var flop = ([x, y]) =>
	x < y ? [x, y] : [y, x];

var layoutFromData = ({reversed, intervals}) => ({
	reversed: reversed,
	chrom: _.pluck(intervals, 'chrom').map(flop),
	screen: _.pluck(intervals, 'screen').map(flop)
});

describe('layoutPlot', function () {
	// pxTransformEach takes a layout, as {chrom, screen, reversed},
	// where chrom and screen are arrays of coordinate pairs. chrom is
	// half-open. screen is closed.
	//
	// It invokes a callback for each range, passing a function that
	// transforms chrom coords to screen coords, the corresponding chrom coords,
	// and the corresponding screen coords.
	//
	// Constraints
	//   Any transformed interval should lie within screen coords, or be empty (clipped).
	//   The last chrom coord should map to the last (or first) screen coord, depending
	//     on reversed.
	//   The first chrom coord should map to the first (or last) screen coord, depending
	//     on reversed.
	const {bool, nearray, tuple, record, nat} = jv,
			interval = tuple([nat, nat]),
			layout = record({reversed: bool, intervals: nearray(record({screen: interval, chrom: interval}))});
	describe('pxTransformEach', function () {
		property("transforms fall within screen interval", layout, interval, function (layoutData, intervalData) {
			var layout = layoutFromData(layoutData),
				interval = flop(intervalData),
				results = [];

			pxTransformEach(layout, (toPx, chrom, screen) => {
				results.push({r: toPx(interval), screen});
			});

			results.forEach(({r: [s, e], screen: [ss, se]}) => {
				assert(s >= ss, 'start coordinate out of bounds');
				assert(e <= se, 'end coordinate out of bounds');
			});
			return true;
		});
		property("transforms map edge to edge", layout, function (layoutData) {
			var layout = layoutFromData(layoutData),
				results = [];

			pxTransformEach(layout, (toPx, chrom, screen) => {
				results.push({r: toPx(chrom), screen});
			});

			results.forEach(({r: [s, e], screen: [ss, se]}) => {
				assert(s === ss, `start coordinate ${s} not on edge ${ss}`);
				assert(e === se, `end coordinate ${e} not on edge ${se}`);
			});
			return true;
		});
	});
});
