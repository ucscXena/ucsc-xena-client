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

//http://www.javascripter.net/faq/hextorgb.htm
var cutHex = function (h) {return (h.charAt(0) === "#") ? h.substring(1, 7) : h;};
var hexToR = function (h) {return parseInt((cutHex(h)).substring(0, 2), 16);};
var hexToG = function (h) {return parseInt((cutHex(h)).substring(2, 4), 16);};
var hexToB = function (h) {return parseInt((cutHex(h)).substring(4, 6), 16);};

var hexToRGB = function(hex){
	var c = {},
		r = hexToR(hex),
		g = hexToG(hex),
		b = hexToB(hex);

    c.r = r;
    c.g = g;
    c.b = b;
    c.a = 1;
    return c;
};

function chromFromAlt(alt) {
	var start = alt.search(/[\[\]]/),
		end = alt.search(":");
	return alt.slice(start + 1, end).replace(/chr/i, "");
}

function structuralVariantClass(alt) {
	var firstBase = _.first(alt),
		lastBase = _.last(alt);
	return firstBase === '[' || firstBase === ']' ? 'left' :
		(lastBase === '[' || lastBase === ']' ? 'right' : null);
}

// structrual variants (SV) have follow vcf https://samtools.github.io/hts-specs/VCFv4.2.pdf
// "[" and "]" in alt means these are SV variants
var isStructuralVariant = ({data: {alt}}) => {
	return structuralVariantClass(alt) !== null;
};

var unknownEffect = 0,
	impact = {
		//destroy protein
		'Nonsense_Mutation': 3,
		'frameshift_variant': 3,
		'stop_gained': 3,
		'splice_acceptor_variant': 3,
		'splice_acceptor_variant&intron_variant':3,
		'splice_donor_variant': 3,
		'splice_donor_variant&intron_variant':3,
		'Splice_Site': 3,
		'Frame_Shift_Del': 3,
		'Frame_Shift_Ins': 3,

		//modify protein
		'splice_region_variant': 2,
		'splice_region_variant&intron_variant': 2,
		'missense': 2,
		'non_coding_exon_variant': 2,
		'missense_variant': 2,
		'Missense_Mutation': 2,
		'RNA': 2,
		'Indel': 2,
		'start_lost': 2,
		'start_gained': 2,
		'De_novo_Start_OutOfFrame': 2,
		'Translation_Start_Site': 2,
		'De_novo_Start_InFrame': 2,
		'stop_lost': 2,
		'Nonstop_Mutation': 2,
		'initiator_codon_variant': 2,
		'5_prime_UTR_premature_start_codon_gain_variant': 2,
		'disruptive_inframe_deletion': 2,
		'disruptive_inframe_insertion': 2,
		'inframe_deletion': 2,
		'inframe_insertion': 2,
		'In_Frame_Del': 2,
		'In_Frame_Ins': 2,

		//do not modify protein
		'exon_variant': 1,
		'synonymous_variant': 1,
		'5_prime_UTR_variant': 1,
		'3_prime_UTR_variant': 1,
		"5'Flank": 1,
		"3'Flank": 1,
		"3'UTR": 1,
		"5'UTR": 1,
		'Silent': 1,
		'stop_retained_variant': 1,

		//mutations outside the exon region and splice region get organge color, code =0
		'others': 0,
		'SV':0,
		'upstream_gene_variant': 0,
		'downstream_gene_variant': 0,
		'intron_variant': 0,
		'intergenic_region': 0,
	},
	chromColorGB = { //genome browser chrom coloring
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
	},
	colors = {
		category4: [
			{r: 255, g: 127, b: 14, a: 1}, // orange #ff7f0e
			{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
			{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
			{r: 214, g: 39, b: 40, a: 1}   // red #d62728
		],
		af: {r: 255, g: 0, b: 0},
		grey: {r: 128, g: 128, b: 128, a: 1}
	},
	colorStr = c =>
		'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')',
	saveUndef = f => v => v == null ? v : f(v),
	round = Math.round,
	decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals

	impactGroups = _.groupBy(_.pairs(impact), ([, imp]) => imp),
	vafLegend = {
		colors: [0, 0.5, 1].map(a => colorStr({...colors.af, a})),
		labels: ['0%', '50%', '100%'],
		align: 'center'
	},

	features = {
		impact: {
			get: (a, v) => impact[v.effect] || (v.effect ? unknownEffect : undefined),
			color: v => colorStr(v == null ? colors.grey : colors.category4[v]),
			legend: {
				colors: _.values(chromColorGB).map(hexToRGB).map(colorStr).reverse().
					concat(colors.category4.map(colorStr)),
				labels: _.keys(chromColorGB).map(key => "chr" + key).reverse().
					concat(_.range(_.keys(impactGroups).length).map(
						i => _.pluck(impactGroups[i], 0).join(', '))),

				align: 'left'
			}
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
function evalMut(flip, mut) {
	return {
		impact: features.impact.get(null, mut),
		right: flip ? -mut.start : mut.start
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

function cmpRowOrNoVariants(v1, v2, flip) {
	if (v1.length === 0) {
		return (v2.length === 0) ? 0 : 1;
	}
	return (v2.length === 0) ? -1 : rowOrder(v1, v2, flip);
}

function cmpRowOrNull(v1, v2, flip) {
	if (v1 == null) {
		return (v2 == null) ? 0 : 1;
	}
	return (v2 == null) ? -1 : cmpRowOrNoVariants(v1, v2, flip);
}

function cmpSamples(probes, sample, flip, s1, s2) {
	return cmpRowOrNull(sample[s1], sample[s2], flip);
}

// XXX Instead of checking strand here, it should be set as a column
// property as part of the user input: flip if user enters a gene on
// negative strand. Don't flip for genomic range view, or positive strand.
function cmp({fields}, data, index) {
	var refGene = _.getIn(data, ['refGene']),
		samples = _.getIn(index, ['bySample']);

	return (!_.isEmpty(refGene) && samples) ?
		(s1, s2) => cmpSamples(fields, samples, _.values(refGene)[0].strand !== '+', s1, s2) :
		() => 0;
}

var sparseDataValues = xenaQuery.dsID_fn(xenaQuery.sparse_data_values);
var refGeneExonValues = xenaQuery.dsID_fn(xenaQuery.refGene_exon_values);

// support for hg18/CRCh36, hg19/CRCh37
var refGene = {
	hg18: JSON.stringify({host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'}),
	GRCh36: JSON.stringify({host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'}),
	hg19: JSON.stringify({host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'}),
	GRCh37: JSON.stringify({host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'})
};

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
		return Rx.Observable.zipArray(
			sparseDataValues(dsID, fields[0], samples),
			refGene[assembly] ? refGeneExonValues(refGene[assembly], fields) : Rx.Observable.return({})
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

function dataToDisplay({width, fields, sFeature, xzoom = {index: 0}},
		vizSettings, data, sortedSamples, dataset, index, zoom) {
	if (!data) {
		return {};
	}
	var {refGene} = data;

	if (_.isEmpty(refGene)){
		return {};
	}
	var refGeneObj = _.values(refGene)[0],
		padding = 1000, // extra bp on both ends of transcripts
		startExon = 0,
		endExon = refGeneObj.exonCount,
		layout = exonLayout.layout(refGeneObj, width, xzoom, padding, startExon, endExon),
		nodes = findNodes(index.byPosition, layout, sFeature, sortedSamples, zoom);

	return {
		layout,
		nodes
	};
}

function index(fieldType, data) {
	if (!data) {
		return null;
	}

	var {req: {rows, samplesInResp}, refGene} = data,
		padding = 1000, // extra bp on both ends of transcripts  ---- redefined here!
		refGeneObj = _.values(refGene)[0],
		newStart = refGeneObj.txStart - padding,
		newEnd = refGeneObj.txEnd + padding,
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
				virtualStart = newStart;
				row.id = id;
			} else if (vclass === 'right') {
				//SV: new segment on the right
				virtualEnd = newEnd;
				row.id = id;
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

widgets.cmp.add('mutation', cmp);
widgets.index.add('mutation', index);
widgets.transform.add('mutation', dataToDisplay);

module.exports = {
	features,
	chromFromAlt,
	isStructuralVariant,
	chromColorGB,
	fetch
};
