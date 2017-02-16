'use strict';

var LZ = require('./lz-string');
var {compactState, expandState} = require('./compactData');
var migrateState = require('./migrateState');

var version = 1.0;

// Serialization
var stringify = state => LZ.compressToUTF16(JSON.stringify({version, appState: compactState(state)}));
var parse = bookmark => migrateState(expandState(JSON.parse(LZ.decompressFromUTF16(bookmark)).appState));

module.exports = {
	version: 1.0,
	hasBookmark: () => location.search.match(/^\?bookmark=/),
	getBookmark: () => location.search.replace(/^\?bookmark=([0-9a-z]+)/, '$1'),
	resetBookmarkLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?bookmark=([0-9a-z]+)/, '')),
	createBookmark: stringify,
	// Need to add version check & merge of state + bookmark.
	parseBookmark: parse
};
