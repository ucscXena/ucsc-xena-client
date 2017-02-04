// Screen layout of exons for a single gene.

/*global require: false, module: false */
'use strict';

var spLen = 3; // size of intronic region to draw between exons

var _ = require('underscore');

// reverse layout if on negative strand.
var reverseIf = (strand, arr) =>
	(strand === '-') ? arr.slice(0).reverse() : arr;

var min = (x, y) => x < y ? x : y;
var max = (x, y) => x > y ? x : y;

// Apply start and end padding.
var applyPad = (arr, {start, end}) =>
	_.updateIn(arr,
			[0, 0], x => start < x ? start :  x,
			[arr.length - 1, 1], x => end > x ? end : x);

var applyClip = (arr, {start, end}) =>
	arr.map(([s, e]) => s > end || e < start ? null : [max(s, start), min(e, end)])
		.filter(x => x);

function pad1(p, intervals, acc) {
	if (intervals.length === 1) {
		return acc.concat(intervals);
	}
	var [[ls, le], [rs, re], ...rest] = intervals;
	return pad1(p, [[rs - p, re]].concat(rest), acc.concat([[ls, le + p]]));
}

// Extend exon intervals, to show splice sites.
// can drop this wrapper with babel, using param default acc=[], above.
var	pad = (p, intervals) => pad1(p, intervals, []);

// XXX This generates exon boundaries on pixel fractions. Might want to
// change it to integer pixels. Note that we can't round + continue the
// calculation because the rounding errors can sum to over a pixel length by
// the end. Instead, project all the lengths from zero & round to avoid
// rounding error accumulating at the end.

// Tail call version. Will be optimized when we switch to babel.
// Also, use defaults offset=0, acc=[]
function toScreen(bpp, [next, ...rest], offset, acc) {
	if (!next) {
		return acc;
	}
	var [start, end] = next,
		len = (end - start + 1) / bpp;
	return toScreen(bpp, rest, len + offset, acc.concat([[offset, len + offset]]));
}

function baseLen(chrlo) {
	return _.reduce(chrlo, (acc, [s, e]) => acc + e - s + 1, 0);
}

function pxLen(chrlo) {
	return _.reduce(chrlo, (acc, [s, e]) => acc + e - s, 0);
}

// Layout exons on screen pixels.
// layout(genepred :: {exonStarts : [<int>, ...], exonEnds: [<int>, ...], strand: <string>)
//  :: {chrom: [[<int>, <int>], ...], screen: [[<int>, <int>], ...], reversed: <boolean>}
// If zoom.start or zoom.end are outside the gene, the first or last exon will be extended to cover
// the zoom region.
// layout chrom pos is closed coords.
// layout screen pos is half open coords.
function layout({chrom, exonStarts, exonEnds, strand}, pxWidth, zoom) {
	var addedSpliceIntvls = pad(spLen, _.zip(exonStarts, exonEnds)),
		paddedIntvals = applyPad(addedSpliceIntvls, zoom),
		clippedIntvals = applyClip(paddedIntvals, zoom),
		chrIntvls = reverseIf(strand, clippedIntvals),
		count = baseLen(chrIntvls),
		bpp = count / pxWidth,
		pixIntvls = toScreen(bpp, chrIntvls, 0, []);

	return {
		chrom: chrIntvls,
		screen: pixIntvls,
		reversed: strand === '-',
		baseLen: count,
		pxLen: pxWidth,
		chromName: chrom,
		zoom: zoom
	};
}

// layout chrom pos is closed coords.
// layout screen pos is half open coords.
function intronLayout({chrom, txStart, txEnd, strand}, pxWidth, zoom) {
	var paddedIntvals = applyPad([[txStart, txEnd]], zoom),
		clippedIntvals = applyClip(paddedIntvals, zoom),
		chrIntvls = reverseIf(strand, clippedIntvals),
		count =  baseLen(chrIntvls),
		bpp = count / pxWidth,
		pixIntvls = toScreen(bpp, chrIntvls, 0, []);

	return {
		chrom: chrIntvls,
		screen: pixIntvls,
		reversed: strand === '-',
		baseLen: count,
		pxLen: pxWidth,
		chromName: chrom,
		zoom: zoom
	};
}

function chromLayout(__, pxWidth, zoom, {chromStart, baseStart, baseEnd}) {
	var intvals = [[baseStart, baseEnd]],
		clippedIntvals = applyClip(intvals, zoom),
		count =  baseLen(clippedIntvals),
		bpp = count / pxWidth,
		pixIntvls = toScreen(bpp, clippedIntvals, 0, []);

	return {
		chrom: clippedIntvals,
		screen: pixIntvls,
		reversed: false,
		baseLen: count,
		pxLen: pxWidth,
		chromName: chromStart,
		zoom: zoom
	};
}

function chromPositionFromScreen(layout, x) {
	var {chrom, screen, reversed} = layout,
		i = _.findIndex(screen, ([x0, x1]) => x0 <= x && x < x1);

	if (i !== -1) {
		let [xStart, xEnd] = screen[i],
			[x0, x1] = reversed ? [xEnd, xStart] : [xStart, xEnd],
			[c0, c1]  = chrom[i];
		return c0 + (x - x0) * (c1 - c0 + 1) / (x1 - x0);
	}
	return null;
}

// closed coord len
var chrlen = ([s, e]) => e - s + 1;


module.exports = {
	chromLayout,
	intronLayout,
	screenLayout: (bpp, chrlo) => toScreen(bpp, chrlo, 0, []),
	baseLen,
	pxLen,
	layout,
	pad,
	zoomCount: (layout, start, end) =>
		_.sum(applyClip(layout.chrom, {start, end}).map(chrlen)),
	chromPositionFromScreen
};
