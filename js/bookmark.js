'use strict';

var LZ = require('./lz-string');
var {uniq} = require('./underscore_ext');
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

function getRecent() {
	try {
		return JSON.parse(localStorage.bookmarks);
	} catch (e) {
		return [];
	}
}

function setRecent(id) {
	var recent = getRecent(),
		time = (new Date()).toString();
	localStorage.bookmarks =
		JSON.stringify(uniq([{id, time}].concat(recent), e => e.id).slice(0, 15));
}

module.exports = {
	version,
	hasBookmark: () => location.search.match(/^\?bookmark=/),
	getBookmark: () => location.search.replace(/^\?bookmark=(_?[0-9a-z]+)/, '$1'),
	resetBookmarkLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?bookmark=(_?[0-9a-z]+)/, '')),
	createBookmark: stringify,
	// Need to add version check & merge of state + bookmark.
	parseBookmark: parse,
	getRecent,
	setRecent
};
