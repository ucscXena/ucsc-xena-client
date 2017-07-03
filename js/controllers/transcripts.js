'use strict';

var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');

// Hard-coded expression dataset
var expressionHost = 'https://toil.xenahubs.net';
var subtypeDataset = 'TCGA_GTEX_category.txt';
var subtypeField = 'TCGA_GTEX_main_category';

var transcriptDataset = {
	host: 'https://reference.xenahubs.net',
	name: 'wgEncodeGencodeBasicV23'
};

var identity = x => x;

var fetchExpression = (transcripts, {studyA, subtypeA, studyB, subtypeB}) =>
	xenaQuery.transcriptExpression(expressionHost,
			_.pluck(transcripts, 'name'), studyA, subtypeA, studyB, subtypeB)
		.map(([expsA, expsB]) => _.mmap(expsA, expsB, transcripts,
					(expA, expB, transcript) => _.assoc(transcript, 'expA', expA, 'expB', expB)));

function fetchTranscripts(serverBus, params) {
	var {host, name} = transcriptDataset,
		query = xenaQuery.geneTranscripts(host, name, params.gene)
			.flatMap(transcripts =>
					fetchExpression(transcripts, params));

	serverBus.next(['geneTranscripts', query]);
}

var prefix = 4; // TCGA, GTEX
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
	'init-post!': fetchSubtypes,
	loadGene: (state, gene, studyA, subtypeA, studyB, subtypeB) =>
		_.updateIn(state, ['transcripts'], s => _.merge(s, {gene, studyA, subtypeA, studyB, subtypeB})),
	'loadGene-post!': (serverBus, state, newState) => {
		if(newState.transcripts.gene)
		{
			fetchTranscripts(serverBus, newState.transcripts);
		}
	},
	geneTranscripts:
		(state, transcripts) => _.assocIn(state, ['transcripts', 'genetranscripts'], transcripts),
	transcriptSampleSubtypes:
		(state, subtypes) => _.assocIn(state, ['transcripts', 'subtypes'], subtypes)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
