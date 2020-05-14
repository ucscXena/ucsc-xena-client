'use strict';

var _ = require('../underscore_ext');
var {parse} = require('./searchParser');
//var {shouldNormalize, shouldLog} = require('./denseMatrix');

var includes = (target, str) => {
	return str.toLowerCase().indexOf(target.toLowerCase()) !== -1;
};

// This assumes that 'matches' is in ascending order.
function invert(matches, sampleCount) {
	var ret = new Array(sampleCount - matches.length);
	for (var i = 0, j = 0, k = 0, m = matches[j]; i < sampleCount; ++i) {
		if (i === m) {
			j += 1;
			m = matches[j];
		} else {
			ret[k] = i;
			k += 1;
		}
	}
	return ret;
}

var sampleMethods = {
	EXACT: (x, y) => x === y,
	CONTAINS: includes
};

// XXX need a more specific name than filterIndices for the wasm
// method, since filterIndices is much more general, taking a
// cmp fn.
// XXX watch at Array.from performance. Converting here because
// underscore union() botches the result with typed arrays. Should probably
// switch to bitmaps.
function filterSampleIds(cohortSamples, type, str) {
	var fi = cohortSamples.filterIndices,
		cmp = sampleMethods[type];
	return fi ? Array.from(fi(str, type)) : _.filterIndices(cohortSamples, s => cmp(str, s));
}

function searchSampleIds(cohortSamples, str) {
	return filterSampleIds(cohortSamples, 'CONTAINS', str);
}

function searchSampleIdsExact(cohortSamples, str) {
	return filterSampleIds(cohortSamples, 'EXACT', str);
}

var searchCoded = _.curry((cmp, ctx, search, data) => {
	var {req: {values: [field]}, codes} = data,
		matches = new Set(_.filterIndices(codes, code => cmp(search, code))),
		filter = search === 'null' ?
			v => isNaN(v) :
			v => matches.has(v); // is this faster than groupby?
	return _.filterIndices(field, filter);
});

var tol = 0.01;
var near = _.curry((x, y) => (x === null || y === null) ? y === x : Math.abs(x - y) < tol);

var searchFloat = _.curry((dataField, cmp, ctx, search, data) => {
	var values = _.getIn(data, [dataField, 'values'], [[]]),
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

var searchMutation = _.curry((cmp, {sampleCount}, search, data) => {
	var {req: {rows, samplesInResp}} = data;

	if (search === 'null') {
		return invert(samplesInResp, sampleCount);
	}

	// omit 'sample' from the variant search, because it is not stable:
	// it's an index into the sample id list, and so changes after filter.
	let matchingRows = _.filter(rows, row => _.any(row, (v, k) => k !== 'sample' && cmp(search, _.isString(v) ? v : String(v))));
	return _.uniq(_.pluck(matchingRows, 'sample'));
});

var searchMethod = {
	coded: searchCoded(includes),
	float: searchFloat('req', near),
	mutation: searchMutation(includes),
	segmented: searchFloat('avg', near),
	samples: searchSampleIds
};

var eq = _.curry((x, y) => x === y);

var searchExactMethod = {
	coded: searchCoded(eq),
	float: searchFloat('req', eq),
	mutation: searchMutation(eq),
	segmented: searchFloat('avg', eq),
	samples: searchSampleIdsExact
};

var empty = () => [];
var lt = _.curry((x, y) => x !== null && y !== null && y < x);
var le = _.curry((x, y) => x !== null && y !== null && y <= x);
var gt = _.curry((x, y) => x !== null && y !== null && y > x);
var ge = _.curry((x, y) => x !== null && y !== null && y >= x);

var searchLt = {
	coded: empty,
	mutation: empty,
	segmented: searchFloat('avg', lt),
	float: searchFloat('req', lt)
};

var searchLe = {
	coded: empty,
	mutation: empty,
	segmented: searchFloat('avg', le),
	float: searchFloat('req', le)
};

var searchGt = {
	coded: empty,
	mutation: empty,
	segmented: searchFloat('avg', gt),
	float: searchFloat('req', gt)
};

var searchGe = {
	coded: empty,
	mutation: empty,
	segmented: searchFloat('avg', ge),
	float: searchFloat('req', ge)
};

var m = (methods, exp, defaultMethod) => {
	let [type, ...args] = exp,
		method = methods[type];
	return method ? method(...args) : defaultMethod(exp);
};

function searchAll(ctx, methods, search) {
	let {cohortSamples, columns, data} = ctx;
	return _.union(..._.map(_.omit(columns, 'samples'), (c, key) => methods[c.valueType](ctx, search, data[key])),
				   methods.samples(cohortSamples, search));
}

function evalFieldExp(ctx, expression, column, data) {
	if (!column || !_.get(data, 'req')) {
		return [];
	}
	return m({
		value: search => searchMethod[column.valueType](ctx, search, data),
		'quoted-value': search => searchExactMethod[column.valueType](ctx, search, data),
		ne: exp => invert(evalFieldExp(ctx, exp, column, data), ctx.sampleCount),
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
		ne: exp => invert(evalexp(ctx, exp), ctx.sampleCount),
		// XXX intersection and union in underscore are n^2
		and: (...exprs) => _.intersection(...exprs.map(e => evalexp(ctx, e))),
		or: (...exprs) => _.union(...exprs.map(e => evalexp(ctx, e))),
		group: exp => evalexp(ctx, exp),
		field: (field, exp) => evalFieldExp(ctx, exp, ctx.columns[ctx.fieldMap[field]], ctx.data[ctx.fieldMap[field]])
	}, expression);
}

function treeToString(tree) {
	return m({
		cross: (...exprs) => _.map(exprs, treeToString).join(' ; '),
		value: value => value,
		'quoted-value': value => `"${value}"`,
		and: (...factors) => _.map(factors, treeToString).join(' '),
		or: (...terms) => _.map(terms, treeToString).join(' OR '),
		group: exp => `(${treeToString(exp)})`,
		field: (field, value) => `${field}:${treeToString(value)}`,
		ne: term => `!=${treeToString(term)}`,
		lt: value => `<${value}`,
		gt: value => `>${value}`,
		le: value => `<=${value}`,
		ge: value => `>=${value}`
	}, tree);
}

function evalcross(ctx, expr) {
	// do this in the parser
	var exprs = expr[0] === 'cross' ?
		expr.slice(1) : [expr];
	return {
		exprs: exprs.map(treeToString),
		matches: exprs.map(exp => evalexp(ctx, exp))
	};
}

function createFieldIds(len) {
	const A = 'A'.charCodeAt(0);
	return _.times(len, i => String.fromCharCode(i + A));
}

function createFieldMap(columnOrder) {
	return _.object(createFieldIds(columnOrder.length), columnOrder);
}

function searchSamples(search, columns, columnOrder, data, cohortSamples) {
	if (!_.get(search, 'length')) {
		return {exprs: null, matches: null};
	}
	let fieldMap = createFieldMap(columnOrder),
		sampleCount = _.get(cohortSamples, 'length');
	try {
		var exp = parse(search.trim());
		return evalcross({columns, data, fieldMap, cohortSamples, sampleCount}, exp);
	} catch(e) {
		console.log('parsing error', e);
		return {exprs: [], matches: [[]]};
	}
}

function remapTreeFields(tree, mapping) {
	return m({
		cross: (...exprs) => ['cross', ..._.map(exprs, t => remapTreeFields(t, mapping))],
		and: (...factors) => ['and', ..._.map(factors, t => remapTreeFields(t, mapping))],
		or: (...terms) => ['or', ..._.map(terms, t => remapTreeFields(t, mapping))],
		group: exp => ['group', remapTreeFields(exp, mapping)],
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
		tree = parse(exp.trim());
	return treeToString(remapTreeFields(tree, mapping));
}

function membershipSum(samples, lists, bits) {
	var ret = new Float32Array(samples.length);
	lists.forEach((list, b) => {
		var len = list.length;
		var bit = bits[b];
		for (var i = 0; i < len; i++) {
			var j = list[i];
			ret[j] += bit;
		}
	});
	return ret;
}

// cross product of boolean terms, as text, e.g. for 2 terms,
// !a !b, a !b, !a b, a b
function booleanCross(terms, i = 0, acc = []) {
	return i === terms.length ? acc :
		booleanCross(terms, i + 1,
			acc.length === 0 ? ['false', 'true'] :
				acc.map(t => `${t};false`).concat(
					acc.map(t => `${t};true`)));
}

function columnData(samples, lists, exprs) {
	var bits = _.times(lists.length, i => 1 << i); // 1, 2
	var column = membershipSum(samples, lists, bits);

	return {
		req: {
			values: [column]
		},
		codes: booleanCross(exprs)
	};
}

module.exports = {
	searchSamples,
	columnData,
	treeToString,
	remapFields,
	parse
};
