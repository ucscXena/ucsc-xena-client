/*global require: false, module: false */
'use strict';

var _ = require('underscore');

// Draw annotations on one or more evenly sized horizontal bands,
// each band representing one set of values. E.g. two bands
// [[2, 3], [7, 8]]
// will render data points with value 2 and 3 on one band, and data points
// with value 7 and 8 on another band. The data points are drawn in the
// order given, so 3 will overwrite 2, and 8 will overwrite 7.
// 'data' should be in the format [{start: i, end: i, val: i}, ...]

function drawBands(vg, bands, color, chromPosToX, data) {
	var count = bands.length,
		height = vg.height() / count,
		dbg = _.groupBy(data, 'val');

	_.each(bands, (band, i) =>
			_.each(band, curval =>
				_.each(dbg[curval], v => {
		var {start, end} = chromPosToX({start:v.start, end:v.end, val:v.val}), // handle ga4gh : 0 based with start+1
			istart = Math.round(start),
			iend = Math.round(end);
		if ((start>0) || (end>0)) {
			vg.box(istart, height * i, iend - istart || 1, height, color(v.val));
		}
	})));
}

var vcmp = ({val: v1}, {val: v2}) => v1 === v2 ? 0 : (v1 > v2 ? 1 : -1);

// Draw annotations on one or more evenly sized horizontal bands,
// each bad representing a different sequence of floating point values.
function drawFloatBands(vg, bands, color, chromPosToX, data) {
	var count = bands.length,
		height = vg.height() / count;

	_.each(bands, (band, i) =>
		_.each(band.slice(0).sort(vcmp), v => { // XXX note the sort
			v.start=v.start+1;  // adjusting start from ga4gh, +1
			var {start, end} = chromPosToX({start:v.start+1, end:v.end, val:v.val}),
				istart = Math.round(start),
				iend = Math.round(end);
			if ((start>0) || (end>0)){
				vg.box(istart, height * i, iend - istart || 1, height, color(v.val));
			}
		}));
}


module.exports = {
	drawBands: drawBands,
	drawFloatBands: drawFloatBands
};
