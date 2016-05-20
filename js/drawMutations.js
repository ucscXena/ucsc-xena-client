/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var {features, chromFromAlt,
	isStructuralVariant, chromeColorGB} = require('./models/mutationVector');

var labelFont = 12;
var labelMargin = 1; // left & right margin

var radius = 4;

// Group by consecutive matches, perserving order.
function groupByConsec(sortedArray, prop, ctx) {
	var cb = _.iteratee(prop, ctx);
	var last = {}, current; // init 'last' with a sentinel, !== to everything
	return _.reduce(sortedArray, (acc, el) => {
		var key = cb(el);
		if (key !== last) {
			current = [];
			last = key;
			acc.push(current);
		}
		current.push(el);
		return acc;
	}, []);
}

function push(arr, v) {
	arr.push(v);
	return arr;
}

// XXX note this draws outside the zoom area. It could be optimized
// by considering zoom count and index.
function drawBackground(vg, width, height, pixPerRow, hasValue) {
	var [stripes] = _.reduce(
			groupByConsec(hasValue, _.identity),
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

	// draw null lable in zoomed-in view
	if (pixPerRow > labelFont) {
		let labelIndices = _.filterIndices(hasValue, hv => !hv);
		labelIndices.forEach(i => {
			vg.textCenteredPushRight(0, pixPerRow * i, width, pixPerRow, 'black', labelFont, "null");
		});
	}
}

function drawImpactPx(vg, width, height, count, pixPerRow, color, variants) {
	// --------- separate variants to SV(with feet "[" , "]" ) vs others (no feet) ---------
	var {true: feetVariants = [], false: nofeetVariants = []} = _.groupBy(variants, isStructuralVariant);

	// --------- no feet variants drawing start here ---------
	var varByImp = groupByConsec(nofeetVariants, v => v.group);

	_.each(varByImp, vars => {
		var points = vars.map(v => {
			var padding = Math.max(0, radius - (v.xEnd - v.xStart + 1) / 2.0);
			return [v.xStart - padding, v.y, v.xEnd + padding, v.y];
		});
		vg.drawPoly(points,
			{strokeStyle: color(vars[0].group), lineWidth: pixPerRow});

		// no feet variants black center
		if (pixPerRow > 2) { // centers when there is enough vertical room for each sample
			points = vars.map(v => [v.xStart, v.y, v.xEnd, v.y]);
			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: pixPerRow});
		}

		// no feet variants label
		if (height / count > labelFont) {
			let h = height / count;

			points.forEach(([x, y], i) => {
				var label = vars[i].data.amino_acid || vars[i].data.alt,
					textWidth = vg.textWidth(labelFont, label);
				vg.textCenteredPushRight( x + 2 * labelMargin, y - h / 2, textWidth, h, 'black', labelFont, label);
			});
		}
	});


	// --------- feet variants drawing start here ---------
	//feet variants group by variant
	var varById = _.groupBy(feetVariants, v => v.data.id),
		varByIdMap = _.mapObject(varById, varList => {
			var {xStart, y, data: {alt}} = _.min(varList, v => v.xStart),
				{xEnd} = _.max(varList, v => v.xStart);

			return {xStart, xEnd, y, color: chromeColorGB[chromFromAlt(alt)], alt};
		});

	//feet variants draw color background according to joining chromosome
	_.each(varByIdMap, variant => {
		var {xStart, xEnd, color, y} = variant,
			padding = Math.max(0, radius - (xEnd - xStart + 1) / 2.0),
			points = [[xStart - padding, y, xEnd + padding, y]];

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: pixPerRow});
	});


	//feet variants draw breakpoint as black vertical bar
	if (pixPerRow > 2) {
		_.each(varByIdMap, variant => {
			var {xStart, xEnd, y} = variant,
				points = [[]];

			if (xStart === 0 && xEnd <= width){
				points = [[xEnd, y, xEnd + 1, y]];
			} else if (xStart > 0 && xEnd > width){
				points = [[xStart, y, xStart + 1, y]];
			}
			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: pixPerRow});
		});
	}

	//feet variants show text label when there is only one variant for this sample, otherwise, text might overlap
	if (height / count > labelFont) {
		var margin = 2 * labelMargin, //more labelMargin due to drawing of breakpoint
			minTxtWidth = vg.textWidth(labelFont, 'WWWW');

		var oneVariantOfSampleList = _.filter(_.groupBy(varById, varList => varList[0].y), list => list.length === 1);
		oneVariantOfSampleList.forEach(variant => {
			var id = variant[0][0].data.id,
				{xStart, xEnd, alt, y} = varByIdMap[id];

			if ((xEnd - xStart) - margin >= minTxtWidth) {
				let h = height / count;
				vg.clip(xStart + margin, y - h / 2, xEnd - xStart - 2 * margin, h, () =>
					vg.textCenteredPushRight( xStart + margin, y - h / 2, xEnd - xStart - margin,
						h, 'black', labelFont, alt)
				);
			}
		});
	};
}

function drawMutations(vg, props) {
	let {width, zoom: {count, height, index}, nodes} = props;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let {feature, samples, index: {bySample: samplesInDS}} = props,
		pixPerRow = height / count,
		minppr = Math.max(pixPerRow, 2),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	drawImpactPx(vg, width, height, count, minppr, features[feature].color, nodes);
}

module.exports = {drawMutations, radius};
