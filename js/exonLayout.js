
// Screen layout of exons for a single gene.

var spLen = 3; // size of intronic region to draw between exons

var _ = require('./underscore_ext').default;

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

function toScreen(bpp, chrIntvls) {
	var lens = chrIntvls.map(([s, e]) => e - s + 1),
		starts = _.scan(lens, (acc, x) => acc + x, 0),
		pxStarts = starts.map(x => Math.round(x / bpp));
	return _.partitionN(pxStarts, 2, 1).slice(0, chrIntvls.length);
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
		pixIntvls = toScreen(bpp, chrIntvls);

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
		pixIntvls = toScreen(bpp, chrIntvls);

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

function chromLayout(__, pxWidth, zoom, {chrom, baseStart, baseEnd}) {
	var intvals = [[baseStart, baseEnd]],
		clippedIntvals = applyClip(intvals, zoom),
		count =  baseLen(clippedIntvals),
		bpp = count / pxWidth,
		pixIntvls = toScreen(bpp, clippedIntvals);

	return {
		chrom: clippedIntvals,
		screen: pixIntvls,
		reversed: false,
		baseLen: count,
		pxLen: pxWidth,
		chromName: chrom,
		zoom: zoom
	};
}

// Finding chrom position from screen coords is more subtle that one might
// hope. Perhaps there's an easier way to think about this.
//
// Consider a layout with 5 base pairs and three pixels:
//
// c | 1| 2| 3| 4| 5|
// p | 0  |  1 |  2 |
//
// For UIs such as drag-zoom, we want to return the largest chrom range
// that overlaps the pixel range.  For example, if the user zooms pixel positions
// [1, 2], we want to zoom to chrom coordinates [2, 5]. For the start position
// we take the lowest overlapping coordinate. For the end position we take the
// highest overlapping coordinate. If instead we were to project start and end
// the same way, it becomes impossible to zoom on the edges of the layout. E.g.
// if we take the lowest overlapping coordinate for both start and end, we
// zoom to [2, 4], and it becomes impossible to ever zoom on chrom position 5.
//
// For start position 1 we project and floor(), to get coordinate 2, like
// Math.floor(project(x)). For end position 2 it's more complex. It's not just
// project and ceil(), as that would still give us 4, when the correct answer
// is 5. We want the last coordinate that is strictly less than the pixel
// *after* 5. I.e. we project pixel 3, which gives us 6, then take 5 as the
// largest integer strictly less than 6. We can express this as
// Math.ceil(project(x + 1) - 1).
//
// Alternatively, we can transform the 'end' case to the 'start' case by
// flopping both the chrom and pixel coordinates. If we compute the coordinates
// from the right edge by passing the pixels from the right edge, then
// it still looks like Math.floor(project(x)). Doing it this way has
// the advantage that it works nicely with our additional complication:
// our intervals are sometimes reversed, for gene views of genes on the
// reverse strand. To handle the reversed views, we flop either the
// pixel coordinate or the chrom coordinate, depending on whether we
// want the highest or lowest overlapping coordinate.
//
// The linear projection works as usual: we translate the input domain
// to the origin, project to the new size using the slope, then translate to
// the output range. We parameterize both translations so we can flop
// the pixel domain, the chrom range, or both.

var toPosition = layout => (px0, chrN, x) => {
	var {chrom, screen} = layout,
		i = _.findIndex(screen, ([x0, x1]) => x0 <= x && x < x1);

	if (i !== -1) {
		let [x0, x1] = screen[i],
			[c0, c1]  = chrom[i];
		return chrN(c0, c1, Math.floor(px0(x0, x1, x) * (c1 - c0 + 1) / (x1 - x0)));
	}
	return null;
};

// pixel translated to origin
var px0 = (start, end, x) => x - start;
// pixel translated to origin, reversed domain
var px0r = (start, end, x) => end - 1 - x;
// chrom translated from origin
var chrN = (start, end, x) => start + x;
// chrom translated from origin, reversed range
var chrNr = (start, end, x) => end - x;

function chromRangeFromScreen(layout, start, end) {
	var toPos = toPosition(layout);
	return layout.reversed ?
		[toPos(px0r, chrN, end), toPos(px0, chrNr, start)] :
		[toPos(px0, chrN, start), toPos(px0r, chrNr, end)];
};

// This isn't precisely correct, but should be good enough. Gives us roughly
// the coordinate in the middle of the pixel.
var chromPositionFromScreen = (layout, x) =>
	Math.round(_.meannull(chromRangeFromScreen(layout, x, x)));

// closed coord len
var chrlen = ([s, e]) => e - s + 1;

module.exports = {
	chromLayout,
	intronLayout,
	screenLayout: toScreen,
	baseLen,
	pxLen,
	layout,
	pad,
	zoomCount: (layout, start, end) =>
		_.sum(applyClip(layout.chrom, {start, end}).map(chrlen)),
	chromPositionFromScreen,
	chromRangeFromScreen
};
