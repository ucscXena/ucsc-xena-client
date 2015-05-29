// Screen layout of exons for a single gene.

/*global require: false, module: false */
'use strict';

var spLen = 15; // size of intronic region to draw between exons

var _ = require('underscore');

// reverse layout if on negative strand.
var reverseIf = (strand, arr) =>
	(strand === '-') ? arr.slice(0).reverse() : arr;

function pad1(p, intervals, acc) {
	if (intervals.length === 1) {
		return acc.concat(intervals);
	}
	var [[ls, le], [rs, re], ...rest] = intervals;
	return pad1(p, [[rs - p, re]].concat(rest), acc.concat([[ls, le + p]]));
}

// can drop this with babel, with param default acc=[], above.
var	pad = (p, intervals) => pad1(p, intervals, []);

// Tail call version. Will be optimized when we switch to babel.
// Also, use defaults offset=0, acc=[]
function toScreen(bpp, [next, ...rest], offset, acc) {
	if (!next) {
		return acc;
	}
	var [start, end] = next,
		len = bpp * (end - start + 1);
	return toScreen(bpp, rest, len + offset, acc.concat([[offset, len + offset - 1]]));
}

// Layout exons on screen pixels.
// layout(genepred :: {exonStarts : [<int>, ...], exonEnds: [<int>, ...], strand: <string>)
//  :: {chrom: [[<int>, <int>], ...], screen: [[<int>, <int>], ...], reversed: <boolean>}
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
