var {get, getIn, Let, merge, mapObject, pick, pluck, uniq, updateIn} = require('./underscore_ext').default;
var {hasBookmark, resetBookmarkLocation, getBookmark} = require('./bookmark');
var {hasInlineState, resetInlineStateLocation} = require('./inlineState');
var {hubParams: getHubParams} = require('./hubParams');
var {allParameters} = require('./util').default;
import {columnsParam} from './columnsParam';
import {heatmapParam} from './heatmapParam';

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

function fixLocalhost(obj) {
	return get(obj, 'host') ?
		updateIn(obj, ['host'], host => host === 'https://local.xena.ucsc.edu:7223' ? 'http://127.0.0.1:7222' : host) : obj;
}

function datasetParams() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'cohort', 'dataset', 'host', 'allIdentifiers', 'markdown'), l => l[0]);
}

function manifest() {
	// only take the first of these
	return mapObject(pick(allParameters(), 'manifest'), l => l[0]);
}


var studyParam = () => pick(allParameters(), 'defaultTable');

function getParams() {
	var columns = columnsParam(),
		hasCols = getIn(columns, ['columns', 'length'], 0) > 0,
		// ignore heatmap param w/o column param.
		heatmap = hasCols ? heatmapParam() : {},
		hub2 = hasCols ? updateIn(hubParams2, ['addHub'], (hubs = []) =>
			uniq(hubs.concat(pluck(columns.columns, 'host')))) :
			hubParams2;
	return merge(hub2, bookmarkParam(), inlineStateParam(), hubParams(),
		fixLocalhost(datasetParams()), manifest(), studyParam(), columns, heatmap);
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
