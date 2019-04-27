'use strict';
import {allParameters} from './util';
import {has, isArray, isObject} from './underscore_ext';

// XXX omit built-in properties
// XXX omit unrecognized properties
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
			var list = JSON.parse(columns);
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
