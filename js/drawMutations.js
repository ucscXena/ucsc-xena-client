/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var {features} = require('./models/mutationVector');

var labelFont = 12;
var labelMargin = 1; // left & right margin

var radius = 4,
	chromeColor_GB = { //genome browser chrom coloring
		"1": "#996600",
		"2": "#666600",
		"3": "#99991E",
		"4": "#CC0000",
		"5": "#FF0000",
		"6": "#FF00CC",
		"7": "#FFCCCC",
		"8": "#3FF9900",
		"9": "#FFCC00",
		"10": "#FFFF00",
		"11": "#CCFF00",
		"12": "#00FF00",
		"13": "#358000",
		"14": "#0000CC",
		"15": "#6699FF",
		"16": "#99CCFF",
		"17": "#00FFFF",
		"18": "#CCFFFF",
		"19": "#9900CC",
		"20": "#CC33FF",
		"21": "#CC99FF",
		"22": "#666666",
		"X": "#999999",
		"Y": "#CCCCCC",
		"M": "#CCCC99"
	};

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

function drawBackground(vg, width, height, count, pixPerRow, hasValue) {
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
	if (height / count > labelFont) {
		let h = height / count;

		rects.map( ([, y, , h2] )=>{  // null label on gray
			var n = Math.round(h2 / h);
			for  (var i = 0; i < n; i++) {
				vg.textCenteredPushRight(0, y + h * i, width, h, 'black', labelFont, "null");
			}
		});
	}
}

function drawImpactPx(vg, width, height, count, pixPerRow, color, variants) {
	// --------- separate variants to SV(with feet "[" , "]" ) vs others (no feet) ---------
	// structrual variants (SV) have follow vcf https://samtools.github.io/hts-specs/VCFv4.2.pdf
	// "[" and "]" in alt means these are SV variants
	var feetVariants = [],
		nofeetVariants = [];
	variants.map(v => {
		var alt = v.data.alt,
			firstBase = alt[0],
			lastBase = alt[alt.length - 1];

		if (firstBase === '[' || firstBase === ']' || lastBase === '[' || lastBase === ']'){
			feetVariants.push(v);
		} else {
			nofeetVariants.push(v);
		}
	});

	// --------- no feet variants drawing start here ---------
	var varByImp = groupByConsec(nofeetVariants, v => v.group);

	_.each(varByImp, vars => {
		var points = vars.map(v => {
			var padding = Math.max(0, radius - (v.xEnd - v.xStart + 1) / 2.0);
 			return [v.xStart - padding, v.y, v.xEnd + padding, v.y];
		});
		vg.drawPoly(points,
			{strokeStyle: color(vars[0].group), lineWidth: pixPerRow});

		// no feet variants black ba
		if (pixPerRow > 2) { // centers when there is enough vertical room for each sample
			points = vars.map(v => [v.xStart, v.y, v.xEnd, v.y]);
			vg.drawPoly(points,
				{strokeStyle: 'black', lineWidth: pixPerRow});
		}

		// no feet variants label
		if (height / count > labelFont) {
			let h = height / count,
				label = "",
				textWidth = 0;

			points.map( ([x, y, , , ], i) => {
				label = vars[i].data.amino_acid || vars[i].data.alt;
				textWidth = vg.textWidth(labelFont, label );
				vg.textCenteredPushRight( x + 2 * labelMargin, y - h / 2, textWidth, h, 'black', labelFont, label);
			});
		}
	});


	// --------- feet variants drawing start here ---------
	//feet variants group by variant
	var varById = _.values(_.groupBy(feetVariants, v => v.data.id)).map(varList => _.sortBy(varList, v => v.xStart)),
		varByIdMap = {};

	varById.map(varList=>{
		var xStart = varList[0].xStart,
			xEnd = varList[varList.length - 1].xEnd,
			y = varList[0].y,
			alt = varList[0].data.alt,
			id = varList[0].data.id,
			patt = /[\[\]]/,
			start = alt.search(patt),
			end = alt.search(":"),
			chrom = alt.slice(start + 1, end).replace(/chr/i, ""),
			color = chromeColor_GB[chrom];

		varByIdMap[id] = {
			xStart:xStart,
			xEnd: xEnd,
			y: y,
			color : color,
			alt : alt
		};
	});

	//feet variants draw color background according to joining chromosome
	_.values(varByIdMap).map(variant =>{
		var xStart = variant.xStart,
			xEnd = variant.xEnd,
			color = variant.color,
			y = variant.y,
			padding = Math.max(0, radius - (xEnd - xStart + 1) / 2.0),
			points = [[xStart - padding, y, xEnd + padding, y]];

		vg.drawPoly(points,
			{strokeStyle: color, lineWidth: pixPerRow});
	});


	//feet variants draw breakpoint as black vertical bar
	if (pixPerRow > 2) {
		_.values(varByIdMap).map(variant =>{
			var xStart = variant.xStart,
				xEnd = variant.xEnd,
				y = variant.y,
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

		var oneVariantOfSampleList = _.values(_.groupBy(varById, varList => varList[0].y)).filter(list => list.length === 1);
		oneVariantOfSampleList.map( variant => {
			var id = variant[0][0].data.id,
				xStart = varByIdMap[id].xStart,
				xEnd = varByIdMap[id].xEnd,
				alt = varByIdMap[id].alt,
				y = varByIdMap[id].y;

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

	drawBackground(vg, width, height, count, pixPerRow, hasValue);
	drawImpactPx(vg, width, height, count, minppr, features[feature].color, nodes);
}

module.exports = {drawMutations, radius};
