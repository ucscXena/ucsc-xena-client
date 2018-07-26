'use strict';

// Domain logic for mutation datasets.

var _ = require('../underscore_ext');
var widgets = require('../columnWidgets');
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx');
var exonLayout = require('../exonLayout');
var intervalTree = require('static-interval-tree');
var {pxTransformInterval} = require('../layoutPlot');
var {hexToRGB, colorStr} = require('../color_helper');
var jStat = require('jStat').jStat;
var parsePos = require('../parsePos');

//function groupedLegend(colorMap, valsInData) { //eslint-disable-line no-unused-vars
//	var inData = new Set(valsInData),
//		groups = _.groupBy(
//			_.filter(_.keys(colorMap), val => inData.has(val)), k => colorMap[k]),
//		colors = _.keys(groups);
//	return {
//		colors,
//		labels: _.map(colors, c => groups[c].join(', ')),
//		align: 'left'
//	};
//}
//
//function sortedLegend(colorMap, valsInData) { //eslint-disable-line no-unused-vars
//	var inData = new Set(valsInData),
//		colorList = _.filter(_.pairs(colorMap), ([val]) => inData.has(val))
//			.sort(([, c0], [, c1]) => c0 > c1 ? -1 : 1);
//	return {
//		colors: _.pluck(colorList, 1),
//		labels: _.pluck(colorList, 0),
//		align: 'left'
//	};
//}

var colors = {
	categoryMutation: [
		//"#C7C7C7",	// lighter gray
		"#9b9b9b",  // darker grey
		"#2CA02C",  // green
		"#1F77B4",  // blue
		"#FF7F0E",  // orange
		"#D62728"   // red
	],
	af: {r: 255, g: 0, b: 0},
	darkGrey: "#9b9b9b", // for unknown function
	grey: "#808080" // for null
};

function inorderLegend(colorMap, valsInData) {
	var inData = new Set(valsInData),
		missing = _.object(
			_.map(_.filter([...inData], v => !_.has(colorMap, v)),
				v => [v, colors.grey])),
		extendedMap = _.merge(colorMap, missing),
		colorList = _.filter(_.pairs(extendedMap), ([val]) => inData.has(val)).reverse(); // Legend reverses
	return {
		colors: _.pluck(colorList, 1),
		labels: _.pluck(colorList, 0),
		align: 'left'
	};
}

var impact = {
		//destroy protein
		'Nonsense_Mutation': 4,
		'Nonsense': 4,
		'frameshift_variant': 4,
		'Frameshift': 4,
		'stop_gained': 4,
		'Stop Gained': 4,
		'Frame_Shift_Del': 4,
		'Frame_Shift_Ins': 4,
		'Frameshift Deletion': 4,
		'Frameshift Insertion': 4,

		//splice related
		'splice_acceptor_variant': 3,
		'splice_acceptor_variant&intron_variant': 3,
		'splice_donor_variant': 3,
		'splice_donor_variant&intron_variant': 3,
		'SpliceAcceptorDeletion': 3,
		'SpliceAcceptorSNV': 3,
		'SpliceDonorBlockSubstitution': 3,
		'SpliceDonorDeletion': 3,
		'SpliceDonorSNV': 3,
		'Splice_Site': 3,
		'splice_region_variant': 3,
		'splice_region_variant&intron_variant': 3,

		//modify protein
		'missense': 2,
		'non_coding_exon_variant': 2,
		'missense_variant': 2,
		'Missense Variant': 2,
		'Missense_Mutation': 2,
		'Missense': 2,
		'MultiAAMissense': 2,
		'start_lost': 2,
		'start_gained': 2,
		'De_novo_Start_OutOfFrame': 2,
		'Translation_Start_Site': 2,
		'CdsStartSNV': 2,
		'De_novo_Start_InFrame': 2,
		'stop_lost': 2,
		'Stop Lost': 2,
		'Nonstop_Mutation': 2,
		'initiator_codon_variant': 2,
		'5_prime_UTR_premature_start_codon_gain_variant': 2,
		'disruptive_inframe_deletion': 2,
		'disruptive_inframe_insertion': 2,
		'inframe_deletion': 2,
		'Inframe Deletion': 2,
		'InFrameDeletion': 2,
		'inframe_insertion': 2,
		'Inframe Insertion': 2,
		'InFrameInsertion': 2,
		'In_Frame_Del': 2,
		'In_Frame_Ins': 2,
		'Indel': 2,

		//do not modify protein
		'synonymous_variant': 1,
		'Synonymous Variant': 1,
		'Synonymous': 1,
		'Silent': 1,
		'stop_retained_variant': 1,

		//mutations effect we don't know
		'lincRNA': 0,
		'RNA': 0,
		'exon_variant': 0,
		'upstream_gene_variant': 0,
		'downstream_gene_variant': 0,
		"5'Flank": 0,
		"3'Flank": 0,
		"3'UTR": 0,
		"5'UTR": 0,
		'5_prime_UTR_variant': 0,
		'3_prime_UTR_variant': 0,
		'Complex Substitution': 0,
		'intron_variant': 0,
		'intron': 0,
		'Intron': 0,
		'intergenic_region': 0,
		'IGR': 0
	},
	chromColorGB = { //genome browser chrom coloring
		"1": "#996600",
		"2": "#666600",
		"3": "#99991E",
		"4": "#CC0000",
		"5": "#FF0000",
		"6": "#FF00CC",
		"7": "#FFCCCC",
		"8": "#3FF990",
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
	},
	chromColorPCAWG = { // PCAWG chrom coloring
        "1": "#DE47AB",
		"2": "#72BE97",
		"3": "#F7F797",
		"4": "#7C749B",
		"5": "#E85726",
		"6": "#B395F8",
		"7": "#DC8747",
		"8": "#96D53D",
		"9": "#DC85EE",
		"10": "#7D32B3",
		"11": "#88DB68",
		"12": "#78AAF1",
		"13": "#D9C6CA",
		"14": "#336C80",
		"15": "#F7CA44",
		"16": "#32C7C7",
		"17": "#D4C5F2",
		"18": "#995493",
		"19": "#F88B78",
		"20": "#475ECC",
		"21": "#E0BD8C",
		"22": "#9E2800",
		"X": "#F2BBD2",
		"Y": "#B6EBEA"
	},
	impactColor = _.mapObject(impact, i => colors.categoryMutation[i]),
	saveUndef = f => v => v == null ? v : f(v),
	round = Math.round,
	decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals
	vafLegend = () => ({
		colors: [0, 0.5, 1].map(a => colorStr({...colors.af, a})),
		labels: ['0%', '50%', '100%'],
		align: 'center'
	}),
	getSVLegend = chromColorMap => ({
		// have to explicitly call hexToRGB to avoid map passing in index.
		colors: chromColorMap ?
			_.values(chromColorMap).map(h => hexToRGB(h)).map(colorStr).reverse() :
			[colors.darkGrey],
		labels: chromColorMap ? _.keys(chromColorMap).map(key => "chr" + key).reverse() :
			['structural variant'],
		align: 'left'
	}),
	features = {
		impact: {
			get: v => v.effect,
			color: (colorMap, v) => colorMap[v] || colors.grey,
			legend: inorderLegend
		},
		// dna_vaf and rna_vaf need to be updated to reflect the call params.
		'dna_vaf': {
			get: v => v.dna_vaf == null ? undefined : decimateFreq(v.dna_vaf),
			color: v => colorStr(v == null ? colors.grey : _.assoc(colors.af, 'a', v)),
			legend: vafLegend
		},
		'rna_vaf': {
			get: v => v.rna_vaf == null ? undefined : decimateFreq(v.rna_vaf),
			color: v => colorStr(v == null ? colors.grey : _.assoc(colors.af, 'a', v)),
			legend: vafLegend
		}
	};

function chromFromAlt(alt) {
	var start = alt.search(/[\[\]]/),
		end = alt.search(":");
	return alt.slice(start + 1, end).replace(/chr/i, "");
}

function posFromAlt(alt) {
	var end = alt.search(/[\[\]\A\T\G\C]{1,2}$/),
		start = alt.search(":");
	return alt.slice(start + 1, end);
}

function structuralVariantClass(alt) {
	var firstBase = _.first(alt),
		lastBase = _.last(alt);
	return firstBase === '[' || firstBase === ']' ? 'left' :
		(lastBase === '[' || lastBase === ']' ? 'right' : null);
}

function joinedVariantDirection(alt) {
	var firstBase = _.first(alt),
		lastBase = _.last(alt);
	return firstBase === ']' || lastBase === ']' ? 'left' :
		(firstBase === '[' || lastBase === '[' ? 'right' : null);
}

var getExonPadding = mutationDataType => {
	if (mutationDataType === "SV") {
		return {
			padTxStart: 2000,
			padTxEnd: 0
		};
	} else if (mutationDataType === "mutation") {
		return {
			padTxStart: 1000,
			padTxEnd: 1000
		};
	} else {
		return {
			padTxStart: 1000,
			padTxEnd: 1000
		};
	}
};


function evalMut(flip, mut) {
	return {
//		impact: features.impact.get(mut),
		right: flip ? -mut.end : mut.start
	};
}

function cmpMut(mut1, mut2) {
	/*
	if (mut1.impact !== mut2.impact) {
		if (mut1.impact === undefined){
			return 1;
		} else if (mut2.impact === undefined) {
			return -1;
		} else {
			return mut2.impact - mut1.impact; // high impact sorts first
		}
	}
	*/
	return mut1.right - mut2.right;       // low coord sorts first
}

function rowOrder(row1, row2, flip) {
	var row1a, row2a;

	// Native map is a lot faster than _.map. Need an es5 polyfill, or
	// perhaps lodash, or ramda.
	row1a = row1.map(m => evalMut(flip, m));
	row2a = row2.map(m => evalMut(flip, m));

	return cmpMut(_.maxWith(row1a, cmpMut), _.maxWith(row2a, cmpMut));
}

function cmpRowOrNoVariants(v1, v2, xzoom, flip) {
	var vf1 = v1.filter(v => v.start <= xzoom.end && v.end >= xzoom.start),
		vf2 = v2.filter(v => v.start <= xzoom.end && v.end >= xzoom.start);
	if (vf1.length === 0) {
		return (vf2.length === 0) ? 0 : 1;
	}
	return (vf2.length === 0) ? -1 : rowOrder(vf1, vf2, flip);
}

function cmpRowOrNull(v1, v2, xzoom, flip) {
	if (v1 == null) {
		return (v2 == null) ? 0 : 1;
	}
	return (v2 == null) ? -1 : cmpRowOrNoVariants(v1, v2, xzoom, flip);
}

function cmpSamples(xzoom, sample, flip, s1, s2) {
	return cmpRowOrNull(sample[s1], sample[s2], xzoom, flip);
}

// XXX Instead of checking strand here, it should be set as a column
// property as part of the user input: flip if user enters a gene on
// negative strand. Don't flip for genomic range view, or positive strand.
function cmp(column, data, index) {
	var {fields: [field], xzoom, sortVisible} = column,
		pos = parsePos(field),
		appliedZoom = sortVisible && xzoom ? xzoom : {start: -Infinity, end: Infinity},
		refGene = _.getIn(data, ['refGene']),
		flip = !pos && refGene && _.getIn(_.values(refGene), [0, 'strand']) === '-',
		samples = _.getIn(index, ['bySample']);

	return samples ?
		(s1, s2) => cmpSamples(appliedZoom, samples, flip, s1, s2) :
		() => 0;
}

var {sparseDataRange, refGeneRange} = xenaQuery;

// XXX Might want to optimize this before committing. We could mutate in-place
// without affecting anyone. This may be slow for large mutation datasets.
//
// Map sampleIDs to index into 'samples' array.
function mapSamples(samples, data) {
	var sampleMap = _.object(samples, _.range(samples.length));

	return _.updateIn(data,
		   ['req', 'rows'], rows => _.map(rows,
			   row => _.assoc(row, 'sample', sampleMap[row.sample])),
		   ['req', 'samplesInResp'], sIR => _.map(sIR, s => sampleMap[s]));
}

//user input is a gene, get the mutations by the gene's genomic coordinates
function fetchGeneByCoordinate({dsID, fields, fieldType, assembly}, samples) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return name ? xenaQuery.refGeneExons(host, name, fields)
		.flatMap(refGene => {
			var coords = _.values(refGene)[0];
			if (!coords) {
				return Rx.Observable.of(null);
			}
			var {txStart, txEnd, chrom} = coords,
				{padTxStart, padTxEnd} = getExonPadding(fieldType);
			return sparseDataRange(dsID, samples, chrom, txStart - padTxStart, txEnd + padTxEnd)
				.map(req => mapSamples(samples, {req, refGene}));
		}) : Rx.Observable.of(null);
}

/*
//user input is a gene, get the mutations by gene annotation that comes with the data
var {sparseData} = xenaQuery;
function fetchGeneByAnnotation({dsID, fields, assembly}, [samples]) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return Rx.Observable.zipArray(
		sparseData(dsID, samples, fields[0]),
		name ? xenaQuery.refGeneExonCase(host, name, fields) : Rx.Observable.of({})
	).map(resp => mapSamples(samples, _.object(['req', 'refGene'], resp)));
}*/

function fetchChrom({dsID, assembly}, samples, pos) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return refGeneRange(host, name, pos.chrom, pos.baseStart, pos.baseEnd)
		.flatMap(refGene =>
			sparseDataRange(dsID, samples, pos.chrom, pos.baseStart, pos.baseEnd)
				.map(req => mapSamples(samples, {req, refGene})));
}

function fetch(column, cohortSamples) {
	var pos = parsePos(column.fields[0]),
		method = pos ? fetchChrom : fetchGeneByCoordinate;
	return method(column, cohortSamples, pos);
}

// Group by, returning groups in sorted order. Scales O(n) vs.
// sort's O(n log n), if the number of values is much smaller than
// the number of elements.
function sortByGroup(arr, keyfn) {
	var grouped = _.groupBy(arr, keyfn);
	return _.map(_.sortBy(_.keys(grouped), _.identity),
			k => grouped[k]);
}

function findSNVNodes(byPosition, layout, colorMap, feature, samples) {
	var sindex = _.object(samples, _.range(samples.length)),
		{get, color} = features[feature],

		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e],
		// sortfn is about 2x faster than sortBy, for large sets of variants
		sortfn = (coll, keyfn) => _.flatten(sortByGroup(coll, keyfn), true);


	// _.uniq is something like O(n^2). Using ES6 Set, which should be more like O(n).
	var matches = new Set(_.flatmap(layout.chrom,
				([start, end]) => intervalTree.matches(byPosition, {start, end})));

	return sortfn([...matches].map(v => {
		var [xStart, xEnd] = minSize(pxTransformInterval(layout, [v.start, v.end]));
		return {
			xStart,
			xEnd,
			y: sindex[v.variant.sample],
			color: color(colorMap, get(v.variant)), // needed for sort, before drawing.
			data: v.variant
		};
	}), v => v.color);
}

function findSVNodes(byPosition, layout, colorMap, samples) {
	var sindex = _.object(samples, _.range(samples.length)),
		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e];

	// _.uniq is something like O(n^2). Using ES6 Set, which should be more like O(n).
	var matches = _.groupBy([...new Set(_.flatmap(layout.chrom,
				([start, end]) => intervalTree.matches(byPosition, {start, end})))],
				v => v.variant.sample);

	return _.flatmap(matches, vars => {
		var count = vars.length;

		return vars.map((v, i) => {

			var [xStart, xEnd] = minSize(pxTransformInterval(layout, [v.start, v.end])),
				y = sindex[v.variant.sample],
				{chr, alt} = v.variant;
			return {
				xStart,
				xEnd,
				y,
				color: colorMap ?
					colorMap[chromFromAlt(alt)] || colorMap[chr.replace(/chr/i, "")] || colors.darkGrey :
					colors.darkGrey,
				subrow: i,
				rowCount: count,
				data: v.variant
			};
		});
	});
}

var swapIf = (strand, [x, y]) => strand === '-' ? [y, x] : [x, y];

function defaultXZoom(pos, refGene, type) {
	if (pos) { // User supplied chrom position
		return {
			start: pos.baseStart,
			end: pos.baseEnd
		};
	}
	var {txStart, txEnd, strand} = refGene,
		{padTxStart, padTxEnd} = getExonPadding(type),
		[startPad, endPad] = swapIf(strand, [padTxStart, padTxEnd]);

	return {
		start: txStart - startPad,
		end: txEnd + endPad
	};
}

var getCustomColor = (dataset, type) =>
	_.getIn(dataset, ['customcolor', type], impactColor);

function svDataToDisplay(column, vizSettings, data, sortedSamples, index) {
	var pos = parsePos(column.fields[0]);
	if (_.isEmpty(data) || _.isEmpty(data.req) || (!pos && _.isEmpty(data.refGene))) {
		return {};
	}
	var colorMapping = {
		"chromosomeGB": chromColorGB,
		"chromosomePCAWG": chromColorPCAWG
	};
	var getColorMapping = svColor => colorMapping[svColor];

	var refGeneObj = _.values(data.refGene)[0],
		maxXZoom = defaultXZoom(pos, refGeneObj, 'SV'), // exported for zoom controls
		{width, showIntrons = false, xzoom = maxXZoom} = column,
		createLayout = pos ? exonLayout.chromLayout : (showIntrons ? exonLayout.intronLayout : exonLayout.layout),
		layout = createLayout(refGeneObj, width, xzoom, pos),
		colorMap = (vizSettings && vizSettings.svColor) ?
			getColorMapping(vizSettings.svColor) : undefined,
		//function to get custom color from metadata:  getCustomColor(column.fieldSpecs, datasets, 'SV'),
		nodes = findSVNodes(index.byPosition, layout, colorMap, sortedSamples);

	return {
		layout,
		nodes,
		maxXZoom,
		legend: getSVLegend(colorMap)
	};
}

function snvDataToDisplay(column, vizSettings, data, sortedSamples, index) {
	var pos = parsePos(column.fields[0]);
	if (_.isEmpty(data) || _.isEmpty(data.req) || (!pos && _.isEmpty(data.refGene))) {
		return {};
	}
	var refGeneObj = _.values(data.refGene)[0],
		maxXZoom = defaultXZoom(pos, refGeneObj, 'mutation'), // exported for zoom controls
		{dataset, width, showIntrons = false,
			sFeature = 'impact', xzoom = maxXZoom} = column,
		allVals = _.uniq(data.req.rows.map(features[sFeature].get)),
		createLayout = pos ? exonLayout.chromLayout : (showIntrons ? exonLayout.intronLayout : exonLayout.layout),
		layout = createLayout(refGeneObj, width, xzoom, pos),
		colorMap = getCustomColor(dataset, 'SNV'),
		nodes = findSNVNodes(index.byPosition, layout, colorMap, sFeature, sortedSamples);

	return {
		layout,
		nodes,
		maxXZoom,
		legend: features[sFeature].legend(colorMap, allVals)
	};
}

function index(fieldType, data) {
	if (!_.get(data, 'req')) {
		return null;
	}

	var {req: {rows, samplesInResp}} = data,
		bySample = _.groupBy(rows, 'sample'),
		empty = []; // use a single empty object.

	rows = rows.map(row => {
		var alt = row.alt,
			virtualStart = row.start,
			virtualEnd = row.end;

		if (row.start === row.end) {  // SV vcf starndard: start is equal to end position
			let vclass = structuralVariantClass(alt);
			if (vclass === 'left') {
				//SV: new segment to the left
				virtualStart = -Infinity;
			} else if (vclass === 'right') {
				//SV: new segment on the right
				virtualEnd = Infinity;
			}
		}
		return {
			start: virtualStart,
			end: virtualEnd,
			variant: row
		};
	});

	return {
		byPosition: intervalTree.index(rows),
		bySample: _.object(
				samplesInResp,
				samplesInResp.map(s => bySample[s] || empty))
	};
}

// SNV P value calculation is an approximation Jing's got from the internet, it is not tested against the exact calculation.
// it is ok to use in the mupit viz, but not confident it can be used to represent the true p value
// in addition, the K value should be the size of the gene coding region, or gene's exon region, or the size of the whole gene including introns, currently set as 1000.
function SNVPvalue (rows, total, k) {
	//total: instances, like total number of people in the experiments
	//k: possible variaty, like 365 days for birthday
	let	newRows = _.map(rows, n => `${n.chr}:${n.start}`);
	return _.values(_.mapObject(_.countBy(newRows, n => n),
		function (val, key) {
			// a classic birthday problem: https://en.wikipedia.org/wiki/Birthday_problem
			// a strong birthday problem: extend to trio (at least a trio) or Quadruple (at least four) etc
			// Journal of Statistical Planning and Inference 130 (2005) 377 – 389  https://www.math.ucdavis.edu/~tracy/courses/math135A/UsefullCourseMaterial/birthday.pdf
			// Poisson approximation
			//        http://math.stackexchange.com/questions/25876/probability-of-3-people-in-a-room-of-30-having-the-same-birthday/25880#25880
			//        no. 28
			// simulation: http://www.drmoron.org/3-birthday-problem/
			// total = 30;
			// val = 4;
			// k = 365;
			// result ≈0.028537
			// P(365,30,3)≃2,85%
			// P(365,30,4)≃0,0532%
			var T = jStat.combination(total, val) / Math.pow(k, (val - 1)),
				pValue = 1 - (Math.exp(-T) + Math.exp( - (T / (1 + val * (total - val) / (2 * k))))) / 2, // no 28
				//pValue2  = 1 - Math.exp(- jStat.combination(total, val) / Math.pow(k, (val - 1))); //no 51
				[chr, start] = key.split(':');

			return {
				chr: chr,
				start: start,
				total: total,
				class: k,
				count: val,
				pValue: pValue
			};
		}
	));
}

////////////////////////////////
// download of on-screen data

function makeRow(fields, sampleGroup, row) {
	let fieldValue;
	if (_.isArray(sampleGroup) && sampleGroup.length === 0) {
		fieldValue = 'no variant';
	}
	if (_.isEmpty(sampleGroup)) {
		sampleGroup = [row];
	}
	return _.flatmap(sampleGroup, row =>
		_.map(fields, f => (row && row[f]) || fieldValue));
}

function getRowFields(rows, sampleGroups) {
	if (_.isEmpty(sampleGroups)) {
		return []; // When no samples exist
	} else if (!_.isEmpty(rows)) {
		return _.keys(rows[0]); // When samples have mutation(s)
	} else {
		return ['sample', 'result']; // default fields for mutation-less columns
	}
}

function formatSamples(sampleFormat, rows) {
	return rows ? _.map(rows, r => _.updateIn(r, ['sample'], sampleFormat)) : rows;
}

function download({data: {req: {rows}}, samples, index, sampleFormat}) {
	let groupedSamples = _.getIn(index, ['bySample']) || [],
		rowFields = getRowFields(rows, groupedSamples),
		allRows = _.map(samples, (sId) => {
			let alternateRow = {sample: sampleFormat(sId)}; // only used for mutation-less samples
			return makeRow(rowFields, formatSamples(sampleFormat, groupedSamples[sId]),
				alternateRow);
		});
	return [rowFields, allRows];
}

widgets.cmp.add('mutation', cmp);
widgets.index.add('mutation', index);
widgets.transform.add('mutation', snvDataToDisplay);
widgets.download.add('mutation', download);

widgets.cmp.add('SV', cmp);
widgets.index.add('SV', index);
widgets.transform.add('SV', svDataToDisplay);
widgets.download.add('SV', download);

module.exports = {
	features,
	chromFromAlt,
	posFromAlt,
	structuralVariantClass,
	joinedVariantDirection,
	chromColorGB,
	SNVPvalue,
	fetch,
	impact
};
