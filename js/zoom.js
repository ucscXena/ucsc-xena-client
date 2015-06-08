/*globals module: false */
'use strict';

// pos :: number, position in current zoom to be centered, as fraction of count
// state :: {index :: number, count :: number}, current zoom position
// total :: total range of data
function zoomIn(index, count, total, pos) {
	var ncount = Math.max(1, Math.floor(count / 3)),
		maxIndex = total - ncount,
		nindex = Math.max(0, Math.min(index + pos * count - ncount / 2, maxIndex));
	return [nindex, ncount];
}

function zoomOut(index, count, total) {
	var ncount = Math.min(total, Math.round(count * 3)),
		maxIndex = total - ncount,
		nindex = Math.max(0, Math.min(index + (count - ncount) / 2, maxIndex));
	return [nindex, ncount];
}

module.exports = {
	zoomIn: zoomIn,
	zoomOut: zoomOut
};
