/*global require: false, module: false */
'use strict';

// Domain logic for mutation datasets.

var _ = require('../underscore_ext');
var widgets = require('../columnWidgets');
var xenaQuery = require('../xenaQuery');
var Rx = require('rx');
var exonLayout = require('../exonLayout');
var intervalTree = require('static-interval-tree');
var {pxTransformFlatmap} = require('../layoutPlot');
var {hexToRGB, colorStr} = require('../color_helper');
var jStat = require('jStat').jStat;

var unknownEffect = 0,
	impact = {
		//destroy protein
		'Nonsense_Mutation': 3,
		'frameshift_variant': 3,
		'stop_gained': 3,
		'Stop Gained': 3,
		'splice_acceptor_variant': 3,
		'splice_acceptor_variant&intron_variant': 3,
		'splice_donor_variant': 3,
		'splice_donor_variant&intron_variant': 3,
		'Splice_Site': 3,
		'Frame_Shift_Del': 3,
		'Frame_Shift_Ins': 3,
		'Frameshift Deletion': 3,
		'Frameshift Insertion': 3,

		//modify protein
		'splice_region_variant': 2,
		'splice_region_variant&intron_variant': 2,
		'missense': 2,
		'non_coding_exon_variant': 2,
		'missense_variant': 2,
		'Missense Variant': 2,
		'Missense_Mutation': 2,
		'Indel': 2,
		'start_lost': 2,
		'start_gained': 2,
		'De_novo_Start_OutOfFrame': 2,
		'Translation_Start_Site': 2,
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
		'inframe_insertion': 2,
		'Inframe Insertion': 2,
		'In_Frame_Del': 2,
		'In_Frame_Ins': 2,

		//do not modify protein
		'synonymous_variant': 1,
		'Synonymous Variant': 1,
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
		'intron_variant': 0,
		'intergenic_region': 0,
		'Complex Substitution': 0,
		'others': 0,
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
	colors = {
		category4: [
			{r: 255, g: 127, b: 14, a: 1}, // orange #ff7f0e
			{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
			{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
			{r: 214, g: 39, b: 40, a: 1},   // red #d62728
		],
		af: {r: 255, g: 0, b: 0},
		grey: {r: 128, g: 128, b: 128, a: 1}
	},
	saveUndef = f => v => v == null ? v : f(v),
	round = Math.round,
	decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals

	impactGroups = _.groupBy(_.pairs(impact), ([, imp]) => imp),
	vafLegend = {
		colors: [0, 0.5, 1].map(a => colorStr({...colors.af, a})),
		labels: ['0%', '50%', '100%'],
		align: 'center'
	},
	getMutationLegend = mutationDataType => {
		// have to explicitly call hexToRGB to avoid map passing in index.
		debugger;
		if (mutationDataType === "SV") {
			return {
				colors: _.values(chromColorGB).map(h => hexToRGB(h)).map(colorStr).reverse(),
				labels: _.keys(chromColorGB).map(key => "chr" + key).reverse(),
				align: 'left'
			};
		} else if (mutationDataType === "mutation") {
			return {
				colors: colors.category4.map(colorStr),
				labels: _.range(_.keys(impactGroups).length).map(i => _.pluck(impactGroups[i], 0).join(', ')),
				align: 'left'
			};
		} else {
			return {
				colors: _.values(chromColorGB).map(h => hexToRGB(h)).map(colorStr).reverse().
					concat(colors.category4.map(colorStr)),
				labels: _.keys(chromColorGB).map(key => "chr" + key).reverse().
					concat(_.range(_.keys(impactGroups).length).map(i => _.pluck(impactGroups[i], 0).join(', '))),
				align: 'left'
			};
		}
	},
	features = {
		impact: {
			get: (a, v) => impact[v.effect] || unknownEffect,
			color: v => colorStr(v == null ? colors.grey : colors.category4[v]),
			legend: getMutationLegend
		},
		'dna_vaf': {
			get: (a, v) => v.dna_vaf == null ? undefined : decimateFreq(v.dna_vaf),
			color: v => colorStr(v == null ? colors.grey : _.assoc(colors.af, 'a', v)),
			legend: vafLegend
		},
		'rna_vaf': {
			get: (a, v) => v.rna_vaf == null ? undefined : decimateFreq(v.rna_vaf),
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

// structrual variants (SV) have follow vcf https://samtools.github.io/hts-specs/VCFv4.2.pdf
// "[" and "]" in alt means these are SV variants
var isStructuralVariant = ({data: {start, end, alt}}) => {
	return structuralVariantClass(alt) !== null || (end - start) > 50;
};

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
		impact: features.impact.get(null, mut),
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

function cmpSamples(probes, xzoom, sample, flip, s1, s2) {
	return cmpRowOrNull(sample[s1], sample[s2], xzoom, flip);
}

// XXX Instead of checking strand here, it should be set as a column
// property as part of the user input: flip if user enters a gene on
// negative strand. Don't flip for genomic range view, or positive strand.
function cmp(column, data, index) {
	var {fields, xzoom, sortVisible} = column,
		appliedZoom = sortVisible && xzoom ? xzoom : {start: -Infinity, end: Infinity},
		refGene = _.getIn(data, ['refGene']),
		samples = _.getIn(index, ['bySample']);

	return (!_.isEmpty(refGene) && samples) ?
		(s1, s2) => cmpSamples(fields, appliedZoom, samples, _.values(refGene)[0].strand !== '+', s1, s2) :
		() => 0;
}

var sparseDataValues = xenaQuery.dsID_fn(xenaQuery.sparse_data_values);

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

function fetch({dsID, fields, assembly}, [samples]) {
	var {name, host} = xenaQuery.refGene[assembly] || {};
	return Rx.Observable.zipArray(
		sparseDataValues(dsID, fields[0], samples),
		name ? xenaQuery.refGene_exon_case(host, name, fields) : Rx.Observable.return({})
	).map(resp => mapSamples(samples, _.object(['req', 'refGene'], resp)));
}

// Group by, returning groups in sorted order. Scales O(n) vs.
// sort's O(n log n), if the number of values is much smaller than
// the number of elements.
function sortByGroup(arr, keyfn) {
	var grouped = _.groupBy(arr, keyfn);
	return _.map(_.sortBy(_.keys(grouped), _.identity),
			k => grouped[k]);
}

function findNodes(byPosition, layout, feature, samples) {
	var sindex = _.object(samples, _.range(samples.length)),
		group = features[feature].get,
		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e],
		// sortfn is about 2x faster than sortBy, for large sets of variants
		sortfn = (coll, keyfn) => _.flatten(sortByGroup(coll, keyfn), true);
	return sortfn(pxTransformFlatmap(layout, (toPx, [start, end]) => {
		var variants = _.filter(
			intervalTree.matches(byPosition, {start: start, end: end}),
			v => _.has(sindex, v.variant.sample));
		return _.map(variants, v => {
			var [pstart, pend] = minSize(toPx([v.start, v.end]));
			return {
				xStart: pstart,
				xEnd: pend,
				y: sindex[v.variant.sample],
				// XXX 1st param to group was used for extending our coloring to other annotations. See
				// ga4gh branch.
				group: group(null, v.variant), // needed for sort, before drawing.
				data: v.variant
			};
		});
	}), v => v.group);
}

var swapIf = (strand, [x, y]) => strand === '-' ? [y, x] : [x, y];

function defaultXZoom(refGene, type) {
	var {txStart, txEnd, strand} = refGene,
		{padTxStart, padTxEnd} = getExonPadding(type),
		[startPad, endPad] = swapIf(strand, [padTxStart, padTxEnd]);

	return {
		start: txStart - startPad,
		end: txEnd + endPad
	};
}

function dataToDisplay(column, vizSettings, data, sortedSamples, datasets, index, zoom) {
	var {fieldType, width, sFeature, showIntrons = false} = column;

	if (!_.get(data, 'req')) {
		return {};
	}
	var {refGene} = data;

	if (_.isEmpty(refGene)) {
		return {};
	}

	var refGeneObj = _.values(refGene)[0],
		{xzoom = defaultXZoom(refGeneObj, fieldType)} = column;

	var createLayout = showIntrons ? exonLayout.intronLayout : exonLayout.layout,
		layout = createLayout(refGeneObj, width, xzoom),
		nodes = findNodes(index.byPosition, layout, sFeature, sortedSamples, zoom);

	return {
		layout,
		nodes
	};
}

function index(fieldType, data) {
	if (!_.get(data, 'req') || _.values(data.refGene).length === 0) {
		return null;
	}

	var {req: {rows, samplesInResp}} = data,
		bySample = _.groupBy(rows, 'sample'),
		empty = []; // use a single empty object.

	rows = rows.map((row, i) => {
		var alt = row.alt,
			id = 'variant_' + i,
			virtualStart = row.start,
			virtualEnd = row.end;

		if (row.start === row.end) {  // SV vcf starndard: start is equal to end position
			let vclass = structuralVariantClass(alt);
			if (vclass === 'left') {
				//SV: new segment to the left
				virtualStart = -Infinity;
				//row.id = id;
			} else if (vclass === 'right') {
				//SV: new segment on the right
				virtualEnd = Infinity;
				//row.id = id;
			}
		}
		row.id = id;
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
function SNVPvalue (rows) {
	let	newRows = _.map(rows, n => `${n.chr}:${n.start}`),
		total = newRows.length,
		// gene, protein, etc size is fixed at 1000
		// this could be actual size of protein or gene, but it is complicated due to mutations could be from exon region and display could be genomics region
		// for the same gene it is a constant, does it really matter to be different between genes?
		k = 1000;

	return _.mapObject(_.countBy(newRows, n => n),
		function (val, key) {
			// a classic birthday problem: https://en.wikipedia.org/wiki/Birthday_problem
			// a strong birthday problem: extend to trio (at least a trio) or Quadruple (at least four) etc
			// Journal of Statistical Planning and Inference 130 (2005) 377 – 389  https://www.math.ucdavis.edu/~tracy/courses/math135A/UsefullCourseMaterial/birthday.pdf
			// Poisson approximation
			//        http://math.stackexchange.com/questions/25876/probability-of-3-people-in-a-room-of-30-having-the-same-birthday/25880#25880
			//        no. 28
			// simulation: http://www.drmoron.org/3-birthday-problem/
			var T = (1 / k) * (1 / k) * jStat.combination(total, val),
				pValue = ( Math.exp(-T) + Math.exp( - (T / (1 + val * (total - val) / (2 * k))))) / 2;
			//var pValue  = 1 - Math.exp(- jStat.combination(total, val) / Math.pow(k, (val -1)));
			var [chr, start] = key.split(':');

			return {
				chr: chr,
				start: start,
				total: total,
				class: k,
				count: val,
				pValue: pValue
			};
		}
	);
}

widgets.cmp.add('mutation', cmp);
widgets.index.add('mutation', index);
widgets.transform.add('mutation', dataToDisplay);

widgets.cmp.add('SV', cmp);
widgets.index.add('SV', index);
widgets.transform.add('SV', dataToDisplay);

module.exports = {
	features,
	chromFromAlt,
	posFromAlt,
	structuralVariantClass,
	isStructuralVariant,
	chromColorGB,
	SNVPvalue,
	defaultXZoom,
	fetch
};
