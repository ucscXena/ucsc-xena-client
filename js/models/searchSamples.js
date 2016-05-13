/*global require: false, module: false, console: false */
'use strict';

var _ = require('../underscore_ext');
var _s = require('underscore.string');
var {parse} = require('./searchParser');


// Return indices of arr for which fn is true. fn is passed the value and index.
// XXX also appears in models/km. Could move to underscore_ext.
var filterIndices = (arr, fn) => _.range(arr.length).filter(i => fn(arr[i], i));

function searchSampleIds(cohortSamples, str) {
	return filterIndices(_.flatten(cohortSamples), s => s.includes(str));
}

function searchSampleIdsExact(cohortSamples, str) {
	return filterIndices(_.flatten(cohortSamples), s => s === str);
}

var searchCoded = _.curry((cmp, search, data) => {
	var {req: {values: [field]}, codes} = data;
	return filterIndices(field, v => _.has(codes, v) && cmp(search, codes[v]));
});

var tol = 0.001;
var near = _.curry((x, y) => Math.abs(x - y) < tol);

var searchFloat = _.curry((cmp, search, data) => {
	var {req: {values}} = data,
		searchVal = parseFloat(search);
	return filterIndices(_.mmap(...values, (...sampleValsI) => {
			let sampleVals = _.initial(sampleValsI);
			return _.any(sampleVals, cmp(searchVal));
		}), _.identity);
});

var searchMutation = _.curry((cmp, search, data) => { //eslint-disable-line no-unused-vars
	console.warn('mutation search not implemented');
	return [];
});

var searchMethod = {
	coded: searchCoded((search, value) => value.includes(search)),
	float: searchFloat(near),
	mutation: searchMutation,
	samples: searchSampleIds
};

var searchExactMethod = {
	coded: searchCoded((target, value) => value === target),
	float: searchFloat(_.curry((x, y) => x === y)), // XXX does this make sense?
	mutation: searchMutation,
	samples: searchSampleIdsExact
};

var empty = () => [];

var searchLt = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => y < x))
};

var searchLe = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => y <= x))
};

var searchGt = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => y > x))
};

var searchGe = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => y >= x))
};

var m = (methods, exp) => {
	let [type, ...args] = exp;
	return methods[type](...args);
};

function searchAll(columns, methods, data, search, cohortSamples) {
	return _.union(..._.map(columns, (c, key) => methods[c.valueType](search, data[key])),
				   methods['samples'](cohortSamples, search));
}

function evalFieldExp(expression, column, data) {
	return m({
		value: search => searchMethod[column.valueType](search, data),
		'quoted-value': search => searchExactMethod[column.valueType](search, data),
		lt: search => searchLt[column.valueType](search, data),
		gt: search => searchGt[column.valueType](search, data),
		le: search => searchLe[column.valueType](search, data),
		ge: search => searchGe[column.valueType](search, data)
	}, expression);
}

function evalexp(expression, columns, data, fieldMap, cohortSamples) {
	return m({
		value: search => searchAll(columns, searchMethod, data, search, cohortSamples),
		'quoted-value': search => searchAll(columns, searchExactMethod, data, search, cohortSamples),
		and: (...exprs) => _.intersection(...exprs.map(e => evalexp(e, columns, data, fieldMap))),
		or: (...exprs) => _.union(...exprs.map(e => evalexp(e, columns, data, fieldMap))),
		group: exp => evalexp(exp, columns, data, fieldMap),
		field: (field, exp) => evalFieldExp(exp, columns[fieldMap[field]], data[fieldMap[field]])
	}, expression);
}

// need column metadata, data, and current expression.

const A = 'A'.charCodeAt(0);

function searchSamples(search, columns, columnOrder, data, cohortSamples) { //eslint-disable-line no-unused-vars
	if (!_.get(search, 'length')) {
		return null;
	}
	let fieldIds = _.range(columnOrder.length).map(i => String.fromCharCode(i + A)),
		fieldMap = _.object(fieldIds, columnOrder);
	try {
		var exp = parse(_s.trim(search));
		return evalexp(exp, columns, data, fieldMap, cohortSamples);
	} catch(e) {
		console.log('parsing error', e);
		return [];
	}
}

module.exports = {
	searchSamples,
	parse
};
