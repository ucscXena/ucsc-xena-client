'use strict';
var {merge, pick, mapObject} = require('./underscore_ext');
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
	return mapObject(pick(allParameters(), 'cohort', 'dataset', 'host', 'allIdentifiers'), l => l[0]);
}

function manifest() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'manifest'), l => l[0]);
}

function getParams() {
	return merge(hubParams2, bookmarkParam(), inlineStateParam(), hubParams(), datasetParams(), manifest());
}

module.exports = getParams;
