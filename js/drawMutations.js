/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var {features} = require('./models/mutationVector');

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
}

function drawImpactPx(vg, width, pixPerRow, color, variants, strand) {
	var varByImp = groupByConsec(variants, v => v.group);

	_.each(varByImp, vars => {
		var points = vars.map(v => {
			var padding = Math.max(0, radius - (v.xEnd - v.xStart + 1) / 2.0);

			// structrual variants (SV) have follow vcf https://samtools.github.io/hts-specs/VCFv4.2.pdf
			// "[" and "]" in alt means these are SV variants
			var firstBase = v.data.alt[0],
				lastBase = v.data.alt[v.data.alt.length-1];

			if ((firstBase ==='[' || firstBase===']') && strand === '+') {
				//SV: new segment to the left
				return [0, v.y, v.xEnd + padding, v.y];
			} else if ((firstBase ==='[' || firstBase===']') && strand === '-') {
				//SV: new segment to the left, right in transcript space
				return [v.xStart - padding, v.y, width + padding, v.y];
			} else if ((lastBase ==='[' || lastBase===']') && strand === '+') {
				//SV: new segment on the right
				return [v.xStart - padding, v.y, width + padding, v.y];
			} else if ((lastBase ==='[' || lastBase===']') && strand === '-') {
				//SV: new segment on the right, left in transcript space
				return [0, v.y, v.xEnd + padding, v.y];
			} else {
				// small indels or SNVs
 				return [v.xStart - padding, v.y, v.xEnd + padding, v.y];
			}
		});
		vg.drawPoly(points,
			{strokeStyle: color(vars[0].group), lineWidth: pixPerRow});

		if (pixPerRow > 2) { // centers when there is enough vertical room for each sample
			points = vars.map(v => [v.xStart, v.y, v.xEnd, v.y]);
			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: pixPerRow});
		}
	});
}

function drawMutations(vg, props) {
	let {width, strand, zoom: {count, height, index}, nodes} = props;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}

	let {feature, samples, index: {bySample: samplesInDS}} = props,
		pixPerRow = height / count,
		minppr = Math.max(pixPerRow, 2),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	drawImpactPx(vg, width, minppr, features[feature].color, nodes, strand);
}

module.exports = {drawMutations, radius};
