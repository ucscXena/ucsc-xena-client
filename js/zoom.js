'use strict';

var zoomDirection = selection => {
	var {start, end, ...zone} = selection,
		g = zone === 'g',
		distanceX = Math.abs(start.x - end.x),
		distanceY = Math.abs(start.y - end.y),
		direction = g ? 'h' : distanceX > distanceY ? 'h' : 'v',
		h = direction === 'h';
	return {
		...zone,
		direction,
		start: h ? start.x : start.y,
		end: h ? end.x : end.y
	};
};

var zoomFlop = (selection) => {
	var {start, end, ...rest} = selection,
		flip = end < start;
	return {
		...rest,
		...(flip ? {end: start, start: end} : {start, end})
	};
};

// pos :: number, position in current zoom to be centered, as fraction of count
// state :: {index :: number, count :: number}, current zoom position
// total :: total range of data
function zoomIn(index, count, total, pos) {
	var ncount = Math.max(1, Math.floor(count / 3)),
		maxIndex = total - ncount,
		nindex = Math.max(0, Math.min(index + pos * count - ncount / 2, maxIndex));
	return [nindex, ncount];
}

// var zoomTrim = selection => {
// 	var {zone, start, end} = selection,
// 		height = geneHeight(),
// 		g = zone === 'g';
// 	return {
// 		start,
// 		end: {
// 			x: end.x,
// 			y: g ? (end.y > height ? height : end.y) : (end.y < height ? height + 1 : end.y)
// 		},
// 		zone
// 	};
// };
//
// // Returns g if zoom drag occurred in annotation, otherwise zoom occurred in samples; return s.
// var zoomZone = selection => {
// 	var {start} = selection,
// 		zone = start.y <= geneHeight() ? 'g' : 's';
// 	return {
// 		...selection,
// 		zone
// 	};
// };

function zoomOut(index, count, total) {
	var ncount = Math.min(total, Math.round(count * 3)),
		maxIndex = total - ncount,
		nindex = Math.max(0, Math.min(index + (count - ncount) / 2, maxIndex));
	return [nindex, ncount];
}

module.exports = {
	zoomDirection,
	zoomFlop,
	zoomIn: zoomIn,
	zoomOut: zoomOut/*,
	zoomTrim,
	zoomZone*/
};
