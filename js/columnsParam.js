'use strict';
import {allParameters} from './util';
import {flatmap, getIn, has, identity, isArray, isBoolean, isObject, isNumber, Let, map, mapObject, merge, omit, pick} from './underscore_ext';

var columnOptPaths = {
	width: ['width'],
	columnLabel: ['user', 'columnLabel'],
	fieldLabel: ['user', 'fieldLabel'],
	sortDirection: ['sortDirection'],
	normalize: ['vizSettings', 'colNormalization'],
	geneAverage: ['fieldType'],
	showIntrons: ['showIntrons'],
	sortVisible: ['sortVisible']
};

// maybe should move the cleaning to models/columns.js, so we can enforce things that vary with column type.
var invalid = {}; // use reference equality to tag invalid values.
var columnOptCleaner = {
	width: v =>
		!isNumber(v) ? invalid :
		v < 10 ? 10 :
		v > 500 ? 500 :
		v,
	sortDirection: s =>
		s === 'reverse' ? s :
		s === 'forward' ? s :
		invalid,
	normalize: v =>
		v === 'none' ? 'none' :
		v === 'mean' ? 'subset' :
		v === 'log2' ? 'log2(x)' :
		v === 'normal2' ? 'normal2' :
		invalid,
	geneAverage: v =>
		!isBoolean(v) ? invalid :
		v ? 'genes' :
		invalid, // not so much invalid, as 'use default': 'geneProbes', or 'probes'.
	showIntrons: v => isBoolean(v) ? v : invalid,
	sortVisible: v => isBoolean(v) ? v : invalid
};
var columnOptClean = (opt, v) => (columnOptCleaner[opt] || identity)(v);
var columnOpts = Object.keys(columnOptPaths);

// invert columnOptCleaner. For creating links.
var columnOptSetter = {
	sortDirection: s =>
		s ? s : invalid,
	normalize: v =>
		v === 'none' ? 'none' :
		v === 'mean' ? 'subset' :
		v === 'log2(x)' ? 'log2' :
		v === 'normal2' ? 'normal2' :
		invalid, // default
	geneAverage: v =>
		v === 'genes' ? true :
		invalid // default
};
var columnOptSet = (opt, v) => (columnOptSetter[opt] || identity)(v);

var columnRequired = [
	'name',
	'host',
	'fields'
];

var columnAllowed = [...columnRequired, ...columnOpts];

var mergeOpts = c =>
	merge(omit(c, columnOpts),
		{opts: flatmap(pick(c, columnOpts), (v, k) =>
			Let((cleaned = columnOptClean(k, v)) =>
				cleaned === invalid ? [] :
				[[columnOptPaths[k], cleaned]]))});

var pickAllowed = c => pick(c, columnAllowed);

var columnSchema = list =>
	isArray(list) &&
	list.length > 0 &&
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

// XXX not really implemented. The idea was to allow 'basic' data types
// via cohort + type.
export var cohort = columns =>
	find(columns, c => has(c, 'cohort'));

// XXX currently unused
export var dataset = columns => columns[0].name;

var columnDatasetFields = column => ({
	...JSON.parse(column.dsID),
	fields: column.fields.join(' ')
});

var columnOptions = column =>
	pick(
		mapObject(columnOptPaths, (path, key) =>
			columnOptSet(key, getIn(column, path))),
		v => v !== invalid);

var encode = x => encodeURIComponent(JSON.stringify(x));

// extract from state
export var getColumns = state =>
	encode(map(omit(getIn(state, ['spreadsheet', 'columns'], {}), 'samples'),
		column => merge(columnOptions(column), columnDatasetFields(column))));
