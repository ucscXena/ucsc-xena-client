'use strict';

var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');

// Hard-coded expression dataset
var expressionHost = 'https://toil.xenahubs.net';

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


var controls = {
	loadGene: (state, gene, studyA, subtypeA, studyB, subtypeB) =>
		_.updateIn(state, ['transcripts'], s => _.merge(s, {gene, studyA, subtypeA, studyB, subtypeB})),
	'loadGene-post!': (serverBus, state, newState) => {
		fetchTranscripts(serverBus, newState.transcripts);
	},
	'geneTranscripts':
		(state, transcripts) => _.assocIn(state, ['transcripts', 'genetranscripts'], transcripts)
};

module.exports = {
	action: (state, [tag, ...args]) => (controls[tag] || identity)(state, ...args),
	postAction: (serverBus, state, newState, [tag, ...args]) => (controls[tag + '-post!'] || identity)(serverBus, state, newState, ...args)
};
