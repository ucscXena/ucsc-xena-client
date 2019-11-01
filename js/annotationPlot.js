// deprecated. Was used to draw ga4gh annotations.
/*global require: false, module: false */

var _ = require('underscore');
var {matches} = require('static-interval-tree');
var {pxTransformEach} = require('./layoutPlot');

// Draw annotations on one or more evenly sized horizontal bands,
// each band representing one set of values. E.g. two bands
// [[2, 3], [7, 8]]
// will render data points with value 2 and 3 on one band, and data points
// with value 7 and 8 on another band. The data points are drawn in the
// order given, so 3 will overwrite 2, and 8 will overwrite 7.
// 'data' should be in the format [{start: i, end: i, val: i}, ...]

function drawBands(vg, bands, color, layout, indx) {
	var count = bands.length,
		height = vg.height() / count;

	pxTransformEach(layout, (toPx, [start, end]) => {
		var matching = matches(indx, {start: start, end: end});
		var dbg = _.groupBy(matching, 'val');

		_.each(bands, (band, i) =>
			_.each(band, curval =>
				_.each(dbg[curval], ({start, end, val}) => {
					var [pstart, pend] = toPx([start, end]);
					vg.box(pstart, height * i, (pend - pstart) || 1, height, color(val));
				})
		));
	});
}


var vcmp = ({val: v1}, {val: v2}) => v1 === v2 ? 0 : (v1 > v2 ? 1 : -1);

// Draw annotations on one or more evenly sized horizontal bands,
// each band representing a different sequence of floating point values.

function drawFloatBands(vg, bands, color, layout) {
	var count = bands.length,
		height = vg.height() / count;

	pxTransformEach(layout, (toPx, [start, end]) => {
		_.each(bands, (band, i) => {
			var matching = matches(band, {start: start, end: end});
			_.each(matching.slice(0).sort(vcmp), ({start, end, val}) => {// sort, so higher vals draw last
				var [pstart, pend] = toPx([start, end]);
				vg.box(pstart, height * i, (pend - pstart) || 1, height, color(val)); // minimum 1 px
			});
		});
	});
}


module.exports = {
	drawBands: drawBands,
	drawFloatBands: drawFloatBands
};
