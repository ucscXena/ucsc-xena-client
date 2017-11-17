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

function hubParams() {
	var hubs = getHubParams();
	return hubs.length ? {hubs} : {};
}

function datasetParams() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'cohort', 'dataset', 'host'), l => l[0]);
}

function getParams() {
	return merge(bookmarkParam(), inlineStateParam(), hubParams(), datasetParams());
}

module.exports = getParams;
