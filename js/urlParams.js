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

var takeFirst = obj => mapObject(obj, l => l[0]);

function datasetParams() {
	// only take the first of these
	return takeFirst(pick(allParameters(), 'cohort', 'dataset', 'host', 'allIdentifiers', 'markdown'));
}

function manifest() {
	// only take the first of these
	return takeFirst(pick(allParameters(), 'manifest'));
}

var types = {
	0: 'navigate',
	1: 'reload',
	2: 'back_forward'
};

function navigate() {
	var navigate;

	try {
		navigate = types[performance.navigation.type];
	} catch (e) {}
	if (!navigate) {
		try {
			navigate = performance.getEntriesByType('navigation')[0].type;
		} catch (e) {}
	}
	return {navigate};
}

var resetStudy = x => {
	history.replaceState({}, 'UCSC Xena',
		location.pathname + location.search.replace(/&?study=[^&]+/, ''));
	return x;
};

var studyParams = () => resetStudy(
	takeFirst(pick(allParameters(), 'defaultTable', 'study')));

var resetAuth = x => {
	history.replaceState({}, 'UCSC Xena',
		location.pathname + location.search.replace(/&?state=[^&]+/, '')
			.replace(/&?code=[^&]+/, '')
			.replace(/&?scope=[^&]+/, '')
			.replace(/&?authuser=[^&]+/, '')
			.replace(/&?prompt=[^&]+/, '')
			.replace(/&?hd=[^&]+/, ''));
	return x;
};

var authParams = () => resetAuth(takeFirst(pick(allParameters(), 'state', 'code')));

var splitChar = (str, chr) => Let((i = str.indexOf(chr)) =>
	[str.slice(0, i), str.slice(i + 1)]);

var restoreFromAuth = () =>  {
	var auth = authParams();

	if (auth.state) {
		var [page, state] = splitChar(auth.state, '@');
		history.replaceState({}, 'UCSC Xena', page);
		return {...auth, ...{state}};
	}
	return {};
};

function getParams() {
	var auth = restoreFromAuth(),
		columns = columnsParam(),
		hasCols = getIn(columns, ['columns', 'length'], 0) > 0,
		// ignore heatmap param w/o column param.
		heatmap = hasCols ? heatmapParam() : {},
		hub2 = hasCols ? updateIn(hubParams2, ['addHub'], (hubs = []) =>
			uniq(hubs.concat(pluck(columns.columns, 'host')))) :
			hubParams2;
	return [location.pathname,
		merge(navigate(), auth, hub2, bookmarkParam(), inlineStateParam(),
		hubParams(), fixLocalhost(datasetParams()), manifest(), studyParams(),
		columns, heatmap)];
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
