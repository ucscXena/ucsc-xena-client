'use strict';

var _ = require('./underscore_ext');
var {contrastColor, lightgreyHEX} = require('./color_helper');

var labelFont = 12;
var labelMargin = 1; // left & right margin

var radius = 4;
var minVariantHeight = pixPerRow => Math.max(pixPerRow, 2); // minimum draw height of 2

var toYPx = (zoom, v) => {
	var {height, count, index} = zoom,
		svHeight = height / count;
	return  {svHeight, y: (v.y - index) * svHeight + (svHeight / 2)};
};

var toYPxSubRow = (zoom, v) => {
	var {rowCount, subrow} = v,
		{height, count} = zoom,
		svHeight = height / (count * rowCount);
	return {svHeight, y: toYPx(zoom, v).y + svHeight * ((1 - rowCount) / 2 + subrow)};
};

var splitRows = (count, height) => height / count > labelFont;

function push(arr, v) {
	arr.push(v);
	return arr;
}

// XXX note this draws outside the zoom area. It could be optimized
// by considering zoom count and index.
function drawBackground(vg, width, height, pixPerRow, hasValue) {
	var [stripes] = _.reduce(
			_.groupByConsec(hasValue, _.identity),
			([acc, sum], g) =>
				[g[0] ? acc : push(acc, [sum, g.length]), sum + g.length],
			[[], 0]);

	vg.smoothing(false);
	vg.box(0, 0, width, height, 'white'); // white background

	var rects = stripes.map(([offset, len]) => [
		0, (offset * pixPerRow),
		width, pixPerRow * len
	]);
	vg.drawRectangles(rects, {fillStyle: 'grey'});

	var nullLabels = stripes.filter(([, len]) => len * pixPerRow > labelFont);
	nullLabels.forEach(([offset, len]) => {
		vg.textCenteredPushRight(0, pixPerRow * offset, width, pixPerRow * len, 'black', labelFont, "null");
	});
}

function drawImpactNodes(vg, width, zoom, smallVariants) {
	// --------- separate variants to SV(with feet "[" , "]" or size >50bp) vs others (small) ---------
	var {height, count} = zoom,
		vHeight = minVariantHeight(height / count),
		minWidth = 2; // double that is the minimum width we draw

	// --------- small variants drawing start here ---------
	var varByImp = _.groupByConsec(smallVariants, v => v.color);

	varByImp.forEach(vars => {
		var points = vars.map(v => {
				var {y} = toYPx(zoom, v),
					padding = _.max([minWidth - Math.abs(v.xEnd - v.xStart), 0]);
				return [v.xStart - padding, y, v.xEnd + padding, y];
			});

		vg.drawPoly(points,
			{strokeStyle: vars[0].color, lineWidth: vHeight});

		/*// no feet variants black center
		if (vHeight > 4) { // centers when there is enough vertical room for each sample
			points = vars.map(v => [v.xStart, yPx(v.y), v.xEnd, yPx(v.y)]);
			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: vHeight});
		}*/

		// small variants label
		if (height / count > labelFont) {
			let h = height / count,
				minTxtWidth = vg.textWidth(labelFont, 'WWWW');

			vars.forEach(function(v) {
				var {xStart, xEnd, data} = v,
					{y} = toYPx(zoom, v),
					label = data.aminoAcid || data.alt,
					textWidth = vg.textWidth(labelFont, label);

				if ((xEnd - xStart) >= minTxtWidth / 5 * label.length) {
					vg.textCenteredPushRight( xStart + labelMargin, y - h / 2, xEnd - xStart - labelMargin,
							h, contrastColor(vars[0].color), labelFont, label);
				} else {
					vg.textCenteredPushRight( xStart, y - h / 2, textWidth, h, lightgreyHEX, labelFont, label);
				}
			});
		}
	});
}

function drawSVNodes(vg, width, zoom, svVariants) {
	var {count, height} = zoom,
		toY = splitRows(count, height) ? toYPxSubRow : toYPx,
		varByIdMap = svVariants.map(v => {
			var {data: {alt, altGene}} = v,
				{svHeight, y} = toY(zoom, v);

			return {
				...v,
				y,
				h: minVariantHeight(svHeight),
				alt,
				altGene
			};
		});

	//SV variants draw color background according to joining chromosome
	varByIdMap.forEach(variant => {
		var {xStart, xEnd, y, color, h} = variant,
			points = [[xStart, y, xEnd, y]];

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: h});
	});


	varByIdMap.forEach(variant => {
		var {xStart, xEnd, y, h} = variant,
			endMark = xEnd <= width ? [[xEnd, y, xEnd + 1, y]] : [],
			startMark = xStart > 0 ? [[xStart, y, xStart + 1, y]] : [],
			points = [...startMark, ...endMark];

		vg.drawPoly(points,
			{strokeStyle: 'black', lineWidth: h});
	});


	//feet variants show text label when there is only one variant for this sample, otherwise, text might overlap
	if (height / count > labelFont) {
		let margin = 2 * labelMargin, //more labelMargin due to drawing of breakpoint
			minTxtWidth = vg.textWidth(labelFont, 'WWWW');

		varByIdMap.forEach(variant => {
			var {xStart, xEnd, y, alt, altGene, h} = variant;

			if ( (h  > labelFont) && ((xEnd - xStart) - margin >= minTxtWidth)) {
				let h = height / count;
				vg.clip(xStart + margin, y - h / 2, xEnd - xStart - 2 * margin, h, () =>
					vg.textCenteredPushRight( xStart + margin, y - h / 2, xEnd - xStart - margin,
						h, 'black', labelFont, altGene ? altGene + " " + alt : alt)
				);
			}
		});
	};
}

var drawWithBackground = _.curry((draw, vg, props) => {
	let {width, zoom, nodes} = props,
		{count, height, index} = zoom;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let {samples, index: {bySample: samplesInDS}} = props,
		last = index + count,
		toDraw = nodes.filter(v => v.y >= index && v.y < last),
		pixPerRow = height / count,
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	draw(vg, width, zoom, toDraw);
});

var drawMutations = drawWithBackground(drawImpactNodes);
var drawSV = drawWithBackground(drawSVNodes);

module.exports = {drawMutations, drawSV, splitRows, radius, minVariantHeight, toYPx, toYPxSubRow, labelFont};
