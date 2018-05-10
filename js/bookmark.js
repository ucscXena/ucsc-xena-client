'use strict';

var LZ = require('./lz-string');
var {compactState, expandState} = require('./compactData');
var migrateState = require('./migrateState');
var {schemaCheckThrow} = require('./schemaCheck');

var version = 1;

// XXX This encode version never worked, because it's encoded inside the blob.
// Needs to be outside the blob. We would need to rewrite the db or API to
// fix this. Maybe should be a POST param, instead of part of the json.

// Serialization
var stringify = state => LZ.compressToUTF16(JSON.stringify({version, appState: compactState(state)}));
var parse = bookmark => schemaCheckThrow(expandState(migrateState(JSON.parse(LZ.decompressFromUTF16(bookmark)).appState)));

module.exports = {
	version,
	hasBookmark: () => location.search.match(/^\?bookmark=/),
	getBookmark: () => location.search.replace(/^\?bookmark=([0-9a-z]+)/, '$1'),
	resetBookmarkLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?bookmark=([0-9a-z]+)/, '')),
	createBookmark: stringify,
	// Need to add version check & merge of state + bookmark.
	parseBookmark: parse
};
