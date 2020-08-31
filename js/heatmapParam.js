var {allParameters} = require('./util').default;
var {flatmap, get, getIn, groupBy, identity, isArray, isBoolean, isObject, isString, Let, mapObject, pick} = require('./underscore_ext').default;

import {parse} from './models/searchParser';

// This is pretty much cut & paste from columnsParam, so might be
// more complex than necessary.

var heatmapOptPaths = {
	showWelcome: ['showWelcome'],
	search: ['sampleSearch'],
	searchSampleList: ['sampleSearch'],
	filter: ['sampleFilter'],
	mode: ['mode']
};

function searchIsValid(s) {
	try {
		parse(s);
	} catch(e) {
		return false;
	}
	return true;
}

var isStringArray = a =>
	isArray(a) && a.every(s => isString(s));

var arrayToSearch = a =>
	a.map(s => `A:="${s}"`).join(' OR ');

var invalid = {}; // use reference equality to tag invalid values.
var heatmapOptCleaner = {
	mode: s =>
		s === 'heatmap' ? s :
		s === 'chart' ? s :
		invalid,
	search: s => searchIsValid(s) ? s : invalid,
	searchSampleList: s => isStringArray(s) ? arrayToSearch(s) : invalid,
	filter: s => searchIsValid(s) ? s : invalid,
	showWelcome: v => isBoolean(v) ? v : invalid,
};
var heatmapOptClean = (opt, v) => (heatmapOptCleaner[opt] || identity)(v);
var heatmapOpts = Object.keys(heatmapOptPaths);

var heatmapOptSetter = {
	mode: s => s ? s : invalid,
	search: s => searchIsValid(s) ? s : invalid,
	searchSampleList: () => invalid, // don't try to save a sample highlight
	filter: () => invalid, // don't try to save a sample filter
	showWelcome: v => v == null ? invalid : v
};
var heatmapOptSet = (opt, v) => (heatmapOptSetter[opt] || identity)(v);

var cleanOpts = c =>
	flatmap(pick(c, heatmapOpts), (v, k) =>
		Let((cleaned = heatmapOptClean(k, v)) =>
			cleaned === invalid ? [] :
			[[heatmapOptPaths[k], cleaned]]));

var heatmapSchema = obj => isObject(obj);

export function heatmapParam() {
	var {heatmap} = allParameters();
	if (heatmap) {
		try {
			var opts = cleanOpts(JSON.parse(heatmap[0]));
			if (heatmapSchema(opts)) {
				var {true: [[, filter]] = [[]], false: other} = groupBy(opts, ([[k]]) => k === 'sampleFilter');
				return {heatmap: other, filter};
			}
			console.log(`Invalid heatmap parameter ${opts}`);
		} catch(e) {
			console.log(`Failed to parse heatmap ${heatmap}`);
		}
	}
	return {};
}

var heatmapOptions = heatmap =>
	pick(
		mapObject(heatmapOptPaths, (path, key) =>
			heatmapOptSet(key, getIn(heatmap, path))),
		v => v !== invalid);

var encode = x => encodeURIComponent(JSON.stringify(x));

export var getHeatmap = state => encode(heatmapOptions(get(state, 'spreadsheet')));
