/*global it: false, require: false, module: false, console: false, describe: false */

var assert = require('assert');
var jv = require('jsverify');
var {allExons, exonGroups, intronRegions} = require('../js/findIntrons');
var _ = require('../js/underscore_ext');

var {nearray, tuple, nat, suchthat} = jv;

var opts = {
	tests: 5000
};

// like jv.property, but set global options
function property(name, ...args) {
    var prop = jv.forall(...args);
    it(name, function () {
      return jv.assert(prop, opts);
    });
}

var rangeToExon = ([start, end]) =>
		start > end ? {start: end, end: start} : {start, end};

var notEmpty = ([start, end]) => start - end !== 0;
var exon = suchthat(tuple([nat, nat]), notEmpty).smap(rangeToExon, ({start, end}) => [start, end]);
// arbitrary list of exons. start/end may be swapped, in which
// case we will fix it before testing.
var exonList = nearray(exon);

describe('findIntrons', function () {
	describe('exons', function () {
		it('should return list of exons', () => {
			var exons = allExons([{
				exonStarts: [100, 200, 300],
				exonEnds: [110, 210, 310]
			}, {
				exonStarts: [100, 210, 320],
				exonEnds: [110, 220, 330]
			}]);
		assert.deepEqual(exons, [{
				start: 100,
				end: 110
			}, {
				start: 200,
				end: 210
			}, {
				start: 300,
				end: 310
			}, {
				start: 100,
				end: 110
			}, {
				start: 210,
				end: 220
			}, {
				start: 320,
				end: 330
			}]);
		});
	});
	describe('exonGroups', () => {
		it('should group overlaps', () => {
			var exons = allExons([{
					exonStarts: [100, 110, 300],
					exonEnds: [120, 120, 310]
				}]),
				groups = exonGroups(exons);
			assert.deepEqual(groups, [{
					start: 100,
					end: 120,
					exons: [{start: 100, end: 120}, {start: 110, end: 120}]
				}, {
					start: 300,
					end: 310,
					exons: [{start: 300, end: 310}]
				}]);
		});
	});
	describe('intronRegions', function () {
		it('should find zero intronic regions', () => {
			var exons = allExons([{
					exonStarts: [100, 100],
					exonEnds: [110, 120]
				}]),
				introns = intronRegions(exonGroups(exons));
			assert.deepEqual(introns, []);
		});
		it('should find one intronic region', () => {
			var exons = allExons([{
					exonStarts: [100, 200],
					exonEnds: [110, 210]
				}]),
				introns = intronRegions(exonGroups(exons));
			assert.deepEqual(introns, [[110, 200]]);
		});
		it('should find two intronic regions', () => {
			var exons = allExons([{
					exonStarts: [100, 200, 300],
					exonEnds: [110, 210, 310]
				}]),
				introns = intronRegions(exonGroups(exons));
			assert.deepEqual(introns, [[110, 200], [210, 300]]);
		});
		property("intron regions have no exons", exonList, exons => {
			var introns = intronRegions(exonGroups(exons));
			introns.forEach(([iStart, iEnd]) =>
				exons.forEach(({start, end}) =>
					assert(!(iStart < end && start < iEnd),
						`Unexpected overlap of intron ${iStart}, ${iEnd} with exon ${start}, ${end}`)));

			return true;
		});
		property("injected intron is found", tuple([exonList, exon]), ([exons, gap]) => {
			// The strategy here is to take a list of exons, slide them ouside
			// the gap, then verify that we find the gap. We slide left or right
			// in an almost random way, based on start + end mod 2.
			// Sorry about the nested ternary.
			var shiftedExons = exons.map(({start, end}) =>
				start < gap.end && gap.start < end ?
					((start + end) % 2 === 0 ? {start: gap.end, end: gap.end + (end - start)} :
						{start: gap.start - (end - start), end: gap.start})
					: {start, end}),
				introns = intronRegions(exonGroups(shiftedExons)),
				match = introns.filter(([start, end]) =>
					start <= gap.start && gap.end <= end),
				allOver = _.every(shiftedExons, ({start}) => start >= gap.end),
				allUnder = _.every(shiftedExons, ({end}) => end <= gap.start);

			// If all the exons are over or under the gap, then we don't call
			// an intronic region, so we'll have no match. This happens about
			// half the time, which is unfortunate, but better than nothing.
			assert(allOver || allUnder || match.length === 1, `Intron ${gap.start}, ${gap.end} not found in results`);

			return true;
		});
	});
});
