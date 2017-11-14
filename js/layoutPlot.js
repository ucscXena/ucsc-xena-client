'use strict';

var _ = require('underscore');

var {min, max, floor} = Math;

function pxTransform1(layout, i, x) {
	var {screen, chrom} = layout,
		pos = chrom[i],
		[start, end] = pos,
		[sstart, send] = screen[i];
	return floor(sstart + (x - start + 1) * (send - sstart) / (end - start + 1));
}

// check for overlap. closed coords.
var overlapsRegion = ([s, e]) => ([cs, ce]) => cs <= e && ce >= s;

// Using this due to poor performance of underscore findLastIndex. Also,
// there's no equivalent es6 method, though there is a [].findIndex.
function findLastIndex(arr, fn) {
	for (let i = arr.length - 1; i >= 0; --i) {
		if (fn(arr[i])) {
			return i;
		}
	}
	return -1;
}
// Find first and last overlapping draw regions
var regionIndxs = (layout, intvl) => {
	var overlaps = overlapsRegion(intvl);
	return [
		layout.chrom.findIndex(overlaps),
		findLastIndex(layout.chrom, overlaps)];
};

function flopIfIndexed(layout, [s, e], [si, ei]) {
	var {reversed, chrom} = layout,
		[siStart, siEnd] = chrom[si],
		[eiStart, eiEnd] = chrom[ei];
	return reversed ?
		[siEnd - e + siStart, eiEnd - s + eiStart] : [s, e];
}

function clipIndexed(layout, [s, e], [si, ei]) {
	var [start] = layout.chrom[si],
		[, end] = layout.chrom[ei];
	return [max(s, start), min(e, end)];
}

var halfOpen = ([a, b]) => [a - 1, b];

// Project to screen coordinates the left-most and right-most
// visible chrom coords.
// flop;clip;halfOpen;map
function pxTransformInterval(layout, intvl) {
	var indxs = regionIndxs(layout, intvl),
		[s, e] = halfOpen(clipIndexed(layout, flopIfIndexed(layout, intvl, indxs), indxs)),
		[si, ei] = indxs;
	return [
		pxTransform1(layout, si, s),
		pxTransform1(layout, ei, e)];
}

function flopIf(reversed, start, end) {
	return reversed ? ([vstart, vend]) => [end - vend + start, end - vstart + start] :
			_.identity;
}

function pxTransformI(layout, fn, i) {
	var {screen, chrom, reversed} = layout,
		pos = chrom[i];

	var [start, end] = pos;
	var [sstart, send] = screen[i];

	// If reversed, we mirror the coords in the exon, rather than swapping all the bounds. This might
	// be simpler.
	var flop = flopIf(reversed, start, end);
	var toPx = x => floor(sstart + (x - start + 1) * (send - sstart) / (end - start + 1));
	var clip = ([s, e]) => [max(s, start), min(e, end)];
	var intvlToPx = i => _.map(halfOpen(clip(flop(i))), toPx);

	return fn(intvlToPx, pos, screen[i]);
}

function pxTransformEach(layout, fn) {
	var {chrom} = layout;

	_.times(chrom.length, i => pxTransformI(layout, fn, i));
}


// This is hacky. Should really have started w/this, instead of
// with pxTransformEach.
function pxTransformFlatmap(layout, fn) {
	var res = [];
	pxTransformEach(layout, (intvlToPx, pos, screen) => {
		res = res.concat(fn(intvlToPx, pos, screen));
	});
	return res;
}

module.exports = {
	pxTransformInterval,
	pxTransformEach,
	pxTransformFlatmap
};
