// Screen layout of exons for a single gene.

/*global require: false, module: false */
'use strict';

var spLen = 15; // size of intronic region to draw between exons

var _ = require('underscore');

// reverse layout if on negative strand.
var reverseIf = (strand, arr) =>
	(strand === '-') ? arr.slice(0).reverse() : arr;

// Add pad between exons that we want to draw.
function pad(p, intervals) {
	var out = intervals.slice(0);
	// for each pair of exons, extend end of left exon, start of right exon.
	_.each(_.range(1, out.length), i => {
		out[i - 1][1] += p;
		out[i][0] -= p;
	});
	return out;
}

// Tail call version. Will be optimized when we switch to babel.
function toScreen(bpp, [next, ...rest], offset, acc) {
	if (!next) {
		return acc;
	}
	var [s, e] = next,
		len = bpp * (e - s + 1);
	return toScreen(bpp, rest, len + offset, acc.concat([[offset, len + offset - 1]]));
}

// XXX promoter region?
function layout({exonStarts, exonEnds, strand}, bpp) {
    var chrIntvls = reverseIf(strand, pad(spLen, _.zip(exonStarts, exonEnds)));
	var pixIntvls = toScreen(bpp, chrIntvls, 0, []);
	return {chrom: chrIntvls, screen: pixIntvls, reversed: strand === '-'};
}

module.exports = {
	layout: layout,
	pad: pad
};
