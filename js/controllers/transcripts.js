'use strict';

var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx');

// Hard-coded expression dataset
var expressionHost = 'https://toil.xenahubs.net';
var subtypeDataset = 'TCGA_GTEX_category.txt';
var subtypeField = 'TCGA_GTEX_main_category';

/*
//basic gencode annotataion
var transcriptDataset = {
	host: 'https://reference.xenahubs.net',
	name: 'wgEncodeGencodeBasicV23'
};
*/

// comprehensive gencode annotataion -- TOIL run was using the v23 comprehensive gencode annotataion
var transcriptDataset = {
	host: 'https://reference.xenahubs.net',
	name: 'wgEncodeGencodeCompV23'
};

var expressionDataset = {
	tpm: "TcgaTargetGtex_rsem_isoform_tpm",
	isoformPercentage: "TcgaTargetGtex_rsem_isopct"
};

var identity = x => x;

var prefix = 4; // "TCGA", "GTEX"

// The transcriptExpression query is a bit wonky, because we're pulling the subtypes from TCGA_GTEX_main_category,
// but in transcriptExpression we filter on _sample_type. This assumes the two are kept in sync. It would be
// better to use the same field in both places, but first we need to confirm that it will work.
var fetchExpression = (transcripts, {studyA, subtypeA, studyB, subtypeB, unit}) =>
	xenaQuery.transcriptExpression(expressionHost,
			// adding 1 for the space after the prefix
			_.pluck(transcripts, 'name'), studyA, subtypeA.slice(prefix + 1), studyB, subtypeB.slice(prefix + 1),
			expressionDataset[unit])
		.map(([expsA, expsB]) => _.mmap(expsA, expsB, transcripts,
					(expA, expB, transcript) => _.assoc(transcript, 'expA', expA, 'expB', expB)));

function fetchTranscripts(serverBus, params) {
	var {host, name} = transcriptDataset,
		query = Rx.Observable.zip(
			xenaQuery.geneTranscripts(host, name, params.gene)
				.flatMap(transcripts =>
						fetchExpression(transcripts, params)),
			xenaQuery.datasetMetadata(expressionHost, expressionDataset[params.unit]),
			(transcripts, [meta]) => ({transcripts, unit: meta.unit}));

	serverBus.next(['geneTranscripts', query]);
}

function filterSubtypes(subtypes) {
	var study = _.groupBy(subtypes[subtypeField], subtype => subtype.slice(0, prefix));

	return {
		tcga: study.TCGA,
		gtex: study.GTEX
	};
}

function fetchSubtypes(serverBus) {
	serverBus.next(['transcriptSampleSubtypes',
				   xenaQuery.fieldCodes(expressionHost, subtypeDataset, [subtypeField])
						.map(filterSubtypes)]);
}

var controls = {
	'init-post!': (serverBus, state, newState) => {
		var {gene, studyA, status} = newState.transcripts || {};
		fetchSubtypes(serverBus);
		if ((status === 'loading' || status === 'error') && gene && studyA) {
			fetchTranscripts(serverBus, newState.transcripts);
		}
	},
	loadGene: (state, gene, studyA, subtypeA, studyB, subtypeB, unit) => {
		var zoom = (state.transcripts && gene === state.transcripts.gene) ? state.transcripts.zoom : {};
		return _.updateIn(state, ['transcripts'], s =>
			_.merge(s, {
					status: gene ? 'loading' : undefined,
					gene,
					studyA,
					subtypeA,
					studyB,
					subtypeB,
					unit,
					zoom}));
	},
	'loadGene-post!': (serverBus, state, newState) => {
		if(newState.transcripts.gene)
		{
			fetchTranscripts(serverBus, newState.transcripts);
		}
	},
	geneTranscripts:
		(state, {transcripts, unit}) => _.assocIn(state,
												  ['transcripts', 'status'], 'loaded',
												  ['transcripts', 'genetranscripts'], transcripts,
												  ['transcripts', 'datasetUnit'], unit),
	'geneTranscripts-error': state => _.assocIn(state, ['transcripts', 'status'], 'error'),
	transcriptSampleSubtypes:
		(state, subtypes) => _.assocIn(state, ['transcripts', 'subtypes'], subtypes),
	units: (state, units) => _.assocIn(state, ['transcripts', 'units'], units),
	transcriptZoom: (state, name) => _.updateIn(state, ['transcripts', 'zoom', name], z => !z)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
