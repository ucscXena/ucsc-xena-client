/*global require: false, module: false, console: false */
'use strict';

var _ = require('../underscore_ext');
var _s = require('underscore.string');
var {parse} = require('./searchParser');

var includes = (target, str) => {
	return str.toLowerCase().indexOf(target.toLowerCase()) !== -1;
};

function invert(matches, allSamples) {
	return _.difference(allSamples, matches);
}

// XXX ugh. Need a tail call.
function filterSampleIds(cohortSamples, cmp, str) {
	var i = 0, res = [];
	cohortSamples.forEach(samples => {
		samples.forEach(s => {
			if (cmp(str, s)) {
				res.push(i);
			}
			++i;
		});
	});
	return res;
}

function searchSampleIds(cohortSamples, str) {
	return filterSampleIds(cohortSamples, includes, str);
}

function searchSampleIdsExact(cohortSamples, str) {
	return filterSampleIds(cohortSamples, (x, y) => x === y, str);
}

var searchCoded = _.curry((cmp, ctx, search, data) => {
	var {req: {values: [field]}, codes} = data,
		filter = search === 'null' ?
			v => v === null :
			v => _.has(codes, v) && cmp(search, codes[v]);
	return _.filterIndices(field, filter);
});

var tol = 0.01;
var near = _.curry((x, y) => (x === null || y === null) ? y === x : Math.abs(x - y) < tol);

var searchFloat = _.curry((cmp, ctx, search, data) => {
	var {req: {values}} = data,
		searchVal = search === 'null' ? null : parseFloat(search);

	if (searchVal === null) { // special case for null: handle sub-columns.
		let cols = _.range(values.length),
			rows = _.range(values[0].length);
		return _.filterIndices(rows, i => _.every(cols, j => values[j][i] === null));
	}
	if (isNaN(searchVal) || values.length > 1) {
		// don't try to search strings against floats, and don't try to
		// search sub-columns.
		return [];
	}
	return _.filterIndices(_.map(values[0], cmp(searchVal)), _.identity);
});

var searchMutation = _.curry((cmp, {allSamples}, search, data) => {
	var {req: {rows, samplesInResp}} = data;

	if (search === 'null') {
		return invert(samplesInResp, allSamples);
	}

	let matchingRows = _.filter(rows, row => _.any(row, v => cmp(search, _.isString(v) ? v : String(v))));
	return _.uniq(_.pluck(matchingRows, 'sample'));
});

var searchMethod = {
	coded: searchCoded(includes),
	float: searchFloat(near),
	mutation: searchMutation(includes),
	samples: searchSampleIds
};

var searchExactMethod = {
	coded: searchCoded((target, value) => value === target),
	float: searchFloat(_.curry((x, y) => x === y)),
	mutation: searchMutation((target, value) => value === target),
	samples: searchSampleIdsExact
};

var empty = () => [];

var searchLt = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => x !== null && y !== null && y < x))
};

var searchLe = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => x !== null && y !== null && y <= x))
};

var searchGt = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => x !== null && y !== null && y > x))
};

var searchGe = {
	coded: empty,
	mutation: empty,
	float: searchFloat(_.curry((x, y) => x !== null && y !== null && y >= x))
};

var m = (methods, exp, defaultMethod) => {
	let [type, ...args] = exp,
		method = methods[type];
	return method ? method(...args) : defaultMethod(exp);
};

function searchAll(ctx, methods, search) {
	let {cohortSamples, columns, data} = ctx;
	return _.union(..._.map(columns, (c, key) => methods[c.valueType](ctx, search, data[key])),
				   methods['samples'](cohortSamples, search));
}

function evalFieldExp(ctx, expression, column, data) {
	if (!column || !_.get(data, 'req')) {
		return [];
	}
	return m({
		value: search => searchMethod[column.valueType](ctx, search, data),
		'quoted-value': search => searchExactMethod[column.valueType](ctx, search, data),
		ne: exp => invert(evalFieldExp(ctx, exp, column, data), ctx.allSamples),
		lt: search => searchLt[column.valueType](ctx, search, data),
		gt: search => searchGt[column.valueType](ctx, search, data),
		le: search => searchLe[column.valueType](ctx, search, data),
		ge: search => searchGe[column.valueType](ctx, search, data)
	}, expression);
}

// XXX should rename ne to not, since we've implemented it that way.
// Unary ! or NOT can be implemented using the same operation.
function evalexp(ctx, expression) {
	return m({
		value: search => searchAll(ctx, searchMethod, search),
		'quoted-value': search => searchAll(ctx, searchExactMethod, search),
		ne: exp => invert(evalexp(ctx, exp), ctx.allSamples),
		and: (...exprs) => _.intersection(...exprs.map(e => evalexp(ctx, e))),
		or: (...exprs) => _.union(...exprs.map(e => evalexp(ctx, e))),
		group: exp => evalexp(ctx, exp),
		field: (field, exp) => evalFieldExp(ctx, exp, ctx.columns[ctx.fieldMap[field]], ctx.data[ctx.fieldMap[field]])
	}, expression);
}

function createFieldIds(len) {
	const A = 'A'.charCodeAt(0);
	return _.range(len).map(i => String.fromCharCode(i + A));
}

function createFieldMap(columnOrder) {
	return _.object(createFieldIds(columnOrder.length), columnOrder);
}

function searchSamples(search, columns, columnOrder, data, cohortSamples) { //eslint-disable-line no-unused-vars
	if (!_.get(search, 'length')) {
		return null;
	}
	let fieldMap = createFieldMap(columnOrder),
		allSamples = _.range(_.sum(_.pluck(cohortSamples, 'length')));
	try {
		var exp = parse(_s.trim(search));
		return evalexp({columns, data, fieldMap, cohortSamples, allSamples}, exp);
	} catch(e) {
		console.log('parsing error', e);
		return [];
	}
}

function treeToString(tree) {
	return m({
		value: value => value,
		'quoted-value': value => `"${value}"`,
		and: (...factors) => _.map(factors, treeToString).join(' '),
		or: (...terms) => _.map(terms, treeToString).join(' OR '),
		field: (field, value) => `${field}:${treeToString(value)}`,
		ne: term => `!=${treeToString(term)}`,
		lt: value => `<${value}`,
		gt: value => `>${value}`,
		le: value => `<=${value}`,
		ge: value => `>=${value}`
	}, tree);
}

function remapTreeFields(tree, mapping) {
	return m({
		and: (...factors) => ['and', ..._.map(factors, t => remapTreeFields(t, mapping))],
		or: (...terms) => ['or', ..._.map(terms, t => remapTreeFields(t, mapping))],
		field: (field, value) => ['field', _.get(mapping, field, 'XXX'), value]
	}, tree, _.identity);
}

// Remap field ids in search expressions. For example,
//
// oldOrder: [uuid0, uuid1, ...]
// newOrder: [uuid1, uuid0, ...]
// exp: "A:foo B:bar"
// out: "A:bar B:foo"
function remapFields(oldOrder, order, exp) {
	if (!_.get(exp, 'length')) {
		return null;
	}
	var fieldIds = createFieldIds(order.length),
		oldFieldMap = _.invert(createFieldMap(oldOrder)),
		newOrder = _.map(order, uuid => oldFieldMap[uuid]),
		mapping = _.object(newOrder, fieldIds),
		tree = parse(_s.trim(exp));
	return treeToString(remapTreeFields(tree, mapping));
}

module.exports = {
	searchSamples,
	treeToString,
	remapFields,
	parse
};
