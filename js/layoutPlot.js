/*global module: false, require: false */
'use strict';

var _ = require('underscore');

var {min, max, round} = Math;

function flopIf(reversed, start, end) {
	return reversed ? ([vstart, vend]) => [end - vend + start, end - vstart + start] :
			_.identity;
}

var halfOpen = ([a, b]) => [a - 1, b];

function pxTransformEach(layout, fn) {
	var {screen, chrom, reversed, pxLen, baseLen} = layout;
	var index = _.get_in(layout, ['zoom', 'index']);
	// XXX This is wrong if there are spaces between layout elements.
	var offset =  pxLen / baseLen * index;

	_.each(chrom, (pos, i) => {
		var [start, end] = pos;
		var [sstart, send] = screen[i];
		var flop = flopIf(reversed, start, end);
		// XXX Why round?
		var toPx = x => round(sstart + (x - start + 1) * (send - sstart + 1) / (end - start + 1) - offset);
		var clip = ([s, e]) => [max(s, start), min(e, end)];
		var intvlToPx = i => _.map(halfOpen(clip(flop(i))), toPx);

		fn(intvlToPx, pos, screen[i]);
	});
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
	pxTransformEach: pxTransformEach,
	pxTransformFlatmap: pxTransformFlatmap
};
