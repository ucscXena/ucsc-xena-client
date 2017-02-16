'use strict';
var _ = require('./underscore_ext');
var {hasBookmark, resetBookmarkLocation, getBookmark} = require('./bookmark');
var {hasInlineState, resetInlineStateLocation} = require('./inlineState');
var {hubParams: getHubParams} = require('./hubParams');

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

function getParams() {
	return _.merge(bookmarkParam(), inlineStateParam(), hubParams());
}

module.exports = getParams;
