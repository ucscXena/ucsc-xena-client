
import LZ from './lz-string';
var {uniq} = require('./underscore_ext').default;
import { compactState, expandState } from './compactData.js';
import migrateState from './migrateState.js';
import { schemaCheckThrow } from './schemaCheck.js';
var {Observable: {of}} = require('./rx').default;

var version = 1;

// XXX This encode version never worked, because it's encoded inside the blob.
// Needs to be outside the blob. We would need to rewrite the db or API to
// fix this. Maybe should be a POST param, instead of part of the json.

// Serialization
var stringify = state => LZ.compressToUTF16(JSON.stringify({version, appState: compactState(state)}));
var parse = bookmark => of(bookmark)
	.map(b => migrateState(JSON.parse(LZ.decompressFromUTF16(b)).appState))
	.flatMap(expandState).map(schemaCheckThrow);

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

const hasBookmark = () => location.search.match(/^\?bookmark=/);
const getBookmark = () => location.search.replace(/^\?bookmark=(_?[0-9a-z]+)/, '$1');

const resetBookmarkLocation = () => history.replaceState({}, 'UCSC Xena',
        location.pathname + location.search.replace(/\?bookmark=(_?[0-9a-z]+)/, ''));

export { version, hasBookmark, getBookmark, resetBookmarkLocation, stringify as createBookmark, parse as parseBookmark, getRecent, setRecent };
