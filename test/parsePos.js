/*global it: false, describe: false */

var assert = require('assert');
var jv = require('jsverify');
var parsePos = require('../js/parsePos');
var _ = require('underscore');

var {tuple, oneof, integer, uint32, constant} = jv;

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

var max = ([x, y]) => x > y ? x : y;
var min = ([x, y]) => x > y ? y : x;

describe('parsePos', function () {
	var c = constant,
		pos = tuple([
				oneof(tuple([uint32, uint32]), c('p'), c('q'), c('')),
				oneof(integer(1, 22), c('x'), c('y')),
				oneof(c('hg18'), c('hg19'), c('hg38'), c(null))]);

	property('expandState(compactState(x)) is identity',
		pos, function ([opt, chrom, assembly]) {
			var str = _.isArray(opt) ?
				`chr${chrom}:${min(opt)}-${max(opt)}` : `chr${chrom}${opt}`,
				parsed = parsePos(str, assembly);

			// Would be nice to assert that the range matches the input,
			// but it's hard to meet all the edge conditions w/o copying the
			// implementation, e.g. clipping to chrom boundaries.
			assert.equal(
				`chr${String(chrom).toUpperCase()}`,
				parsed.chrom,
				`chrom ${chrom} === ${parsed.chrom}`);
			assert(_.isNumber(parsed.baseStart), 'baseStart is number');
			assert(_.isNumber(parsed.baseEnd), 'baseEnd is number');
			assert(parsed.baseStart > 0, 'baseStart is positive');
			assert(parsed.baseEnd >= parsed.baseStart, 'baseEnd >= baseStart');

			return true;
		});
});

