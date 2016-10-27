/*global module: false */
/*eslint-env browser */

'use strict';

var LZ = require('lz-string');
var migrateState = require('./migrateState');

var version = 1.0;
module.exports = {
	version: 1.0,
	hasBookmark: () => location.search.match(/^\?bookmark=/),
	getBookmark: () => location.search.replace(/^\?bookmark=([0-9a-z]+)/, '$1'),
	resetBookmarkLocation: () => history.replaceState({}, 'UCSC Xena',
			location.pathname + location.search.replace(/\?bookmark=([0-9a-z]+)/, '')),
	createBookmark: appState => LZ.compressToUTF16(JSON.stringify({version, appState})),
	// Need to add version check & merge of state + bookmark.
	parseBookmark: bookmark => migrateState(JSON.parse(LZ.decompressFromUTF16(bookmark)).appState)
};
