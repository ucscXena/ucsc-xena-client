/*global require: false, module: false */
'use strict';

// Domain logic for mutation datasets.

var _ = require('underscore'),
	widgets = require('../columnWidgets'),
	xenaQuery = require('../xenaQuery'),
	Rx = require('rx'),
	exonLayout = require('../exonLayout'),
	intervalTree = require('static-interval-tree');

var unknownEffect = 0,
	impact = {
		'Nonsense_Mutation': 3,
		'frameshift_variant': 3,
		'stop_gained': 3,
		'splice_acceptor_variant': 3,
		'splice_donor_variant': 3,
		'Splice_Site': 3,
		'Frame_Shift_Del': 3,
		'Frame_Shift_Ins': 3,

		'splice_region_variant': 2,
		'missense': 2,
		'non_coding_exon_variant': 2,
		'missense_variant': 2,
		'Missense_Mutation': 2,
		'exon_variant': 2,
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
		'inframe_deletion': 2,
		'inframe_insertion': 2,
		'In_Frame_Del': 2,
		'In_Frame_Ins': 2,

		'synonymous_variant': 1,
		'5_prime_UTR_variant': 1,
		'3_prime_UTR_variant': 1,
		"5'Flank": 1,
		"3'Flank": 1,
		"3'UTR": 1,
		"5'UTR": 1,
		'Silent': 1,
		'stop_retained_variant': 1,
		'upstream_gene_variant': 1,
		'downstream_gene_variant': 1,
		'intron_variant': 1,
		'Intron': 1,
		'intergenic_region': 1,
		'IGR': 1,

		"others": 0
	},
	colors = {
		category25: [
			{r: 255, g: 127, b: 14, a: 1},  // orange #ff7f0e
			{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
			{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
			{r: 214, g: 39, b: 40, a: 1}  // red #d62728
		],
		af: {r: 255, g: 0, b: 0},
		grey: {r: 128, g: 128, b: 128, a: 1}
	},
	colorStr = c =>
		'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')',
	saveUndef = f => v => v === undefined ? v : f(v),
	round = Math.round,
	decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals

	features = {
		impact: {
			get: (a, v) => impact[v.effect] || (v.effect ? unknownEffect : undefined),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : colors.category25[v])
		},
		'dna_vaf': {
			get: (a, v) => _.isUndefined(v.dna_vaf) || _.isNull(v.dna_vaf) ? undefined : decimateFreq(v.dna_vaf),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : _.assoc(colors.af, 'a', v))
		},
		'rna_vaf': {
			get: (a, v) => _.isUndefined(v.rna_vaf) || _.isNull(v.rna_vaf) ? undefined : decimateFreq(v.rna_vaf),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : _.assoc(colors.af, 'a', v))
		}
	};

function evalMut(refGene, mut) {
	var geneInfo = refGene[mut.gene];
	return {
		impact: features.impact.get(null, mut),
		right: (geneInfo.strand === '+') ?
				mut.start - geneInfo.txStart :
				geneInfo.txStart - mut.start
	};
}

function cmpMut(mut1, mut2) {
	if (mut1.impact !== mut2.impact) {
		if (mut1.impact === undefined){
			return 1;
		} else if (mut2.impact === undefined) {
			return -1;
		} else {
			return mut2.impact - mut1.impact; // high impact sorts first
		}
	}

	return mut1.right - mut2.right;       // low coord sorts first
}

function rowOrder(row1, row2, refGene) {
	var row1a, row2a;

	// Native map is a lot faster than _.map. Need an es5 polyfill, or
	// perhaps lodash, or ramda.
	row1a = row1.map(m => evalMut(refGene, m));
	row2a = row2.map(m => evalMut(refGene, m));

	return cmpMut(_.maxWith(row1a, cmpMut), _.maxWith(row2a, cmpMut));
}

function cmpRowOrNoVariants(v1, v2, refGene) {
	if (v1.length === 0) {
		return (v2.length === 0) ? 0 : 1;
	}
	return (v2.length === 0) ? -1 : rowOrder(v1, v2, refGene);
}

function cmpRowOrNull(v1, v2, refGene) {
	if (v1 == null) {
		return (v2 == null) ? 0 : 1;
	}
	return (v2 == null) ? -1 : cmpRowOrNoVariants(v1, v2, refGene);
}

function cmpSamples(probes, data, refGene, s1, s2) {
	return _.findValue(probes, function (f) {
		// XXX check this null condition.
		return data && refGene && refGene[f] ?
			cmpRowOrNull(data[s1], data[s2], refGene) : 0;
	});
}

function cmp({fields}, {req: {samples}, refGene}) {
	return (s1, s2) => cmpSamples(fields, samples, refGene, s1, s2);
}

var sparseDataValues = xenaQuery.dsID_fn(xenaQuery.sparse_data_values);
var refGeneExonValues = xenaQuery.dsID_fn(xenaQuery.refGene_exon_values);

// XXX hard-coded for now
var refGene = JSON.stringify({
	host: "https://genome-cancer.ucsc.edu/proj/public/xena",
	name: "common/GB/refgene_good"
});

function fetch({dsID, fields}, samples) {
		return Rx.Observable.zipArray(
			sparseDataValues(dsID, fields, samples),
			refGeneExonValues(refGene, fields)
		).map(resp => _.object(['req', 'refGene'], resp));
}

// XXX memoizing this is going to be entertaining, since the
// different props have different dependencies.
function dataToDisplay({width, fields, xzoom = {index: 0}},
		vizSettings, {req: {rows}, refGene}) {
	return {
		index: intervalTree.index(rows),
		// should compute index by sample here, when we have selectors.
		layout: exonLayout.layout(_.values(refGene)[0], width, xzoom)
	};
}


widgets.cmp.add('mutationVector', cmp);
widgets.fetch.add('mutationVector', fetch);
widgets.transform.add('mutationVector', dataToDisplay);

module.exports = features;
