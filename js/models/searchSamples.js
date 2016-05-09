/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');


// Return indices of arr for which fn is true. fn is passed the value and index.
// XXX also appears in models/km. Could move to underscore_ext.
var filterIndices = (arr, fn) => _.range(arr.length).filter(i => fn(arr[i], i));

function searchCoded(search, data) {
	var {req: {values: [field]}, codes} = data;
	return filterIndices(field, v => _.has(codes, v) && codes[v].includes(search));
}

var tol = 0.001;
var near = _.curry((x, y) => Math.abs(x - y) < tol);

function searchFloat(search, data) {
	var {req: {values}} = data,
		searchVal = parseFloat(search);
	return filterIndices(_.mmap(...values, (...sampleVals) => _.any(sampleVals, near(searchVal))), _.identity);
}

function searchMutation() {
	return [];
}

var searchMethod = {
	coded: searchCoded,
	float: searchFloat,
	mutation: searchMutation
};

function samplesSearch(search, columns, data, samples) {
	return search && search.length > 0 ? 
		_.union(..._.map(columns, (c, key) => searchMethod[c.valueType](search, data[key]))) : samples;
}

module.exports = samplesSearch;
