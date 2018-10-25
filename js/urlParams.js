'use strict';
var {Let, merge, pick, mapObject} = require('./underscore_ext');
var {hasBookmark, resetBookmarkLocation, getBookmark} = require('./bookmark');
var {hasInlineState, resetInlineStateLocation} = require('./inlineState');
var {hubParams: getHubParams} = require('./hubParams');
var {allParameters} = require('./util');

// This is all really wonky & needs refactor.

function bookmarkParam() {
	var ret = {};
	if (hasBookmark()) {
		ret = {'bookmark': getBookmark()};
		resetBookmarkLocation();
	}
	return ret;
}

function inlineStateParam() {
	var ret = {};
	if (hasInlineState()) {
		ret = {'inlineState': true};
		resetInlineStateLocation();
	}
	return ret;
}

// XXX Deprecating these, in favor of hubParams2.
function hubParams() {
	var hubs = getHubParams();
	return hubs.length ? {hubs} : {};
}

var hubParams2 = pick(allParameters(), 'addHub', 'removeHub');

function datasetParams() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'cohort', 'dataset', 'host', 'allIdentifiers', 'markdown'), l => l[0]);
}

function manifest() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'manifest'), l => l[0]);
}

function getParams() {
	return merge(hubParams2, bookmarkParam(), inlineStateParam(), hubParams(), datasetParams(), manifest());
}

// Our handling of parameters 'hub' and 'host', is somewhat confusing. 'host'
// means "show the hub page for this url". 'hub' means "add this url to the
// active hub list, and, if in /datapages/ show the hub page for this url".
// The 'hub' parameter can be repeated, which adds each hub to the active hub
// list. Only the first one will be displayed when linking to /datapages/.
// Needs refactor.
export var defaultHost = params =>
	Let(({host, hubs} = params) =>
			!host && hubs ? {...params, host: hubs[0]} : params);

export default getParams;
