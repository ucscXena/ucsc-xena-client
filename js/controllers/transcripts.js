
var _ = require('../underscore_ext').default;
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx').default;

// the expression dataset and phenodataset must be on the same host
var expressionHost = 'https://kidsfirst.xenahubs.net';
//var expressionHost = 'https://toil.xenahubs.net';

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
	tpm: "TCGA_target_GTEX_KF/rsem.isoforms_TPM.txt",
	isoformPercentage: "TCGA_target_GTEX_KF/rsem.isoforms_IsoPct.txt"
//	tpm: "TcgaTargetGtex_rsem_isoform_tpm",
//	isoformPercentage: "TcgaTargetGtex_rsem_isopct"
};

var subtypeDataset = 'transcript_view/transcript_main_category.txt';
var subtypeField = 'transcript_view_category';
//var subtypeDataset = 'TCGA_GTEX_category.txt';
//var subtypeField = 'TCGA_GTEX_main_category';

var identity = x => x;

// The transcriptExpression query is a bit wonky, because we're pulling the subtypes from TCGA_GTEX_main_category,
// but in transcriptExpression we filter on _sample_type. This assumes the two are kept in sync. It would be
// better to use the same field in both places, but first we need to confirm that it will work.
var fetchExpression = (transcripts, {subtypeA, subtypeB, unit}) =>
	xenaQuery.transcriptExpression(expressionHost,
			// adding 1 for the space after the prefix
			_.pluck(transcripts, 'name'), subtypeA, subtypeB, expressionDataset[unit], subtypeDataset, subtypeField)
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
	return subtypes[subtypeField].sort();
}

function fetchSubtypes(serverBus) {
	serverBus.next(['transcriptSampleSubtypes',
				   xenaQuery.fieldCodes(expressionHost, subtypeDataset, [subtypeField])
						.map(filterSubtypes)]);
}

var controls = {
	'init-post!': (serverBus, state, newState) => {
		var {gene, subtypeA, status} = newState.transcripts || {};
		fetchSubtypes(serverBus);
		if ((status === 'loading' || status === 'error') && gene && subtypeA) {
			fetchTranscripts(serverBus, newState.transcripts);
		}
	},
	loadGene: (state, gene, subtypeA, subtypeB, unit) => {
		var zoom = (state.transcripts && gene === state.transcripts.gene) ? state.transcripts.zoom : {};
		return _.updateIn(state, ['transcripts'], s =>
			_.merge(s, {
					status: gene ? 'loading' : undefined,
					gene,
					subtypeA,
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

export default {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
