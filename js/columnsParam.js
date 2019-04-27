'use strict';
import {allParameters} from './util';
import {has, identity, isArray, isObject, map, merge, omit, pick} from './underscore_ext';

var columnOptPaths = {
	width: ['width'],
	columnLabel: ['user', 'columnLabel'],
	fieldLabel: ['user', 'fieldLabel'],
	sortDirection: ['sortDirection'],
	normalize: ['vizSettings', 'colNormalization']
};
var columnOptCleaner = {
	width: v => v < 10 ? 10 : v > 500 ? 500 : v,
	sortDirection: s => s === 'reverse' ? s : 'forward',
	normalize: v =>
		v === 'mean' ? 'subset' :
		v === 'z-score' ? 'subset-stdev' : undefined
};
var columnOptClean = (opt, v) => (columnOptCleaner[opt] || identity)(v);
var columnOpts = Object.keys(columnOptPaths);

var columnRequired = [
	'name',
	'host',
	'fields'
];

var columnAllowed = [...columnRequired, ...columnOpts];

var mergeOpts = c =>
	merge(omit(c, columnOpts),
		{opts: map(pick(c, columnOpts), (v, k) => [columnOptPaths[k], columnOptClean(k, v)])});

var pickAllowed = c => pick(c, columnAllowed);

var columnSchema = list =>
	isArray(list) &&
	list.every(column =>
			isObject(column) &&
			(has(column, 'name') && has(column, 'host') || has(column, 'cohort') && has(column, 'type')) &&
			has(column, 'fields'));

export function columnsParam() {
	var {columns} = allParameters();
	if (columns) {
		try {
			var list = JSON.parse(columns).map(c => mergeOpts(pickAllowed(c)));
			if (columnSchema(list)) {
				return {columns: list};
			}
		} catch(e) {
			console.log(`Failed to parse columns ${columns}`);
		}
	}
	return {};
}

export var cohort = columns =>
	find(columns, c => has(c, 'cohort'));

// take 1st dataset name, in the case
export var dataset = columns => columns[0].name;
