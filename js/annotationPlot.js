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
		var {start, end} = chromPosToX(v);
		vg.box(start, height * i, end - start, height, color(v.val));
	})));
}

module.exports = {
	drawBands: drawBands
};
