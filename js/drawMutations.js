/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var {features, chromFromAlt, chromColorGB} = require('./models/mutationVector');

var labelFont = 12;
var labelMargin = 1; // left & right margin

var radius = 4;
var minVariantHeight = pixPerRow => Math.max(pixPerRow, 2); // minimum draw height of 2
var toYPx = _.curry((pixPerRow, index, y) => (y - index) * pixPerRow + (pixPerRow / 2));

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

function drawImpactNodes(vg, width, index, height, count, pixPerRow, color, smallVariants) {
	// --------- separate variants to SV(with feet "[" , "]" or size >50bp) vs others (small) ---------
	var yPx = toYPx(pixPerRow, index),
		vHeight = minVariantHeight(pixPerRow),
		minWidth = 3;

	// --------- small variants drawing start here ---------
	var varByImp = _.groupByConsec(smallVariants, v => v.group);

	_.each(varByImp, vars => {
		var points = vars.map(v => {
				var y = yPx(v.y),
					padding = _.max([minWidth - Math.abs(v.xEnd - v.xStart), 0]);
				return [v.xStart - padding, y, v.xEnd + padding, y];
			});

		vg.drawPoly(points,
			{strokeStyle: color(vars[0].group), lineWidth: vHeight});

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
					y = yPx(v.y),
					label = data.amino_acid || data.alt,
					textWidth = vg.textWidth(labelFont, label);

				if ((xEnd - xStart) >= minTxtWidth) {
					vg.textCenteredPushRight( xStart + labelMargin, y - h / 2, xEnd - xStart - labelMargin,
							h, 'white', labelFont, label);
				} else {
					vg.textCenteredPushRight( xEnd + 2 * labelMargin, y - h / 2, textWidth, h, 'black', labelFont, label);
				}
			});
		}
	});
}

function drawSVNodes(vg, width, index, height, count, pixPerRow, color, svVariants) {
	var yPx = toYPx(pixPerRow, index),
		vHeight = minVariantHeight(pixPerRow),
		varByIdMap;

	if (height / count > labelFont) {
		// when there is enough vertical space, each SV of a sample is in a sub-row
		let svBySample = _.values(_.groupBy(svVariants, v => v.y)); // variants grouped by sample

		varByIdMap = _.flatmap(svBySample, varList => {
			var svSize = varList.length,
				svHeight = height / (count * svSize),
				i = - (svSize - 1) / 2.0;

			return _.map(varList, v => {
				var {data: {chr, alt, altGene}} = v,
					y = yPx(v.y) + svHeight * i;

				// XXX overwrite variant list for tooltip
				v.yTransformed = y;
				v.svHeight = svHeight;
				i++;

				return {
					...v,
					y,
					h: svHeight,
					color: chromColorGB[chromFromAlt(alt)] || chromColorGB[chr.replace(/chr/i, "")],
					alt,
					altGene
				};
			});
		});
	} else {
		varByIdMap = _.map(svVariants, v => {
			var {data: {chr, alt, altGene}} = v,
				y = yPx(v.y);

			return {
				...v,
				y,
				h: vHeight,
				color: chromColorGB[chromFromAlt(alt)] || chromColorGB[chr.replace(/chr/i, "")],
				alt,
				altGene
			};
		});
	}

	//SV variants draw color background according to joining chromosome
	_.each(varByIdMap, variant => {
		var {xStart, xEnd, y, color, h} = variant,
			points = [[xStart, y, xEnd, y]];

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: h});
	});


	//feet variants draw breakpoint as black vertical bar
	if (vHeight > 4 && height / count <= labelFont) {
		_.each(varByIdMap, variant => {
			var {xStart, xEnd, y, h} = variant,
				endMark = xEnd <= width ? [[xEnd, y, xEnd + 1, y]] : [],
				startMark = xStart > 0 ? [[xStart, y, xStart + 1, y]] : [],
				points = [...startMark, ...endMark];

			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: h});
		});
	}

	//feet variants show text label when there is only one variant for this sample, otherwise, text might overlap
	if (height / count > labelFont) {
		let margin = 2 * labelMargin, //more labelMargin due to drawing of breakpoint
			minTxtWidth = vg.textWidth(labelFont, 'WWWW');

		_.each(varByIdMap, variant => {
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
	let {width, zoom: {count, height, index}, nodes} = props;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let {feature, samples, index: {bySample: samplesInDS}} = props,
		last = index + count,
		toDraw = nodes.filter(v => v.y >= index && v.y < last),
		pixPerRow = height / count,
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	draw(vg, width, index, height, count, pixPerRow, features[feature].color, toDraw);
});

var drawMutations = drawWithBackground(drawImpactNodes);
var drawSV = drawWithBackground(drawSVNodes);

module.exports = {drawMutations, drawSV, radius, minVariantHeight, toYPx, labelFont};
