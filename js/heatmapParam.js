'use strict';
import {allParameters} from './util';
import {flatmap, identity, isBoolean, isObject, Let, pick} from './underscore_ext';

// This is pretty much cut & paste from columnsParam, so might be
// more complex than necessary.

var heatmapOptPaths = {
	showWelcome: ['showWelcome'],
	mode: ['mode']
};

var invalid = {}; // use reference equality to tag invalid values.
var heatmapOptCleaner = {
	sortDirection: s =>
		s === 'heatmap' ? s :
		s === 'chart' ? s :
		invalid,
	showWelcome: v => isBoolean(v) ? v : invalid,
};
var heatmapOptClean = (opt, v) => (heatmapOptCleaner[opt] || identity)(v);
var heatmapOpts = Object.keys(heatmapOptPaths);

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
				return {heatmap: opts};
			}
			console.log(`Invalid heatmap parameter ${opts}`);
		} catch(e) {
			console.log(`Failed to parse heatmap ${heatmap}`);
		}
	}
	return {};
}
