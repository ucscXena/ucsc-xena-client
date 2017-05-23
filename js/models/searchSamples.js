'use strict';

var _ = require('../underscore_ext');
var _s = require('underscore.string');
var {parse} = require('./searchParser');
//var {shouldNormalize, shouldLog} = require('./denseMatrix');

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

var searchFloat = _.curry((dataField, cmp, ctx, search, data) => {
	var values = _.getIn(data, [dataField, 'values']),
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

/*
var addMeanOrNull = (s, m) => s === 'null' ? 'null' : ('' + (parseFloat(s) + m));

// power(2,x) -1
var power2XplusOneOrNull = (s) => s === 'null' ? 'null' : ('' + (Math.pow(2, parseFloat(s)) - 1.0));
*/

// If searching a mean-normalized column, move the search bounds to reflect
// the normalization. The conversion to float and back is ugly. Otherwise, we'd
// have to move the searchFloat parsing up somehow, or push the transform down.
//
// The mean[0] is because we only handle single-probe columns.
var normalizeSearch = _.curry(({vizSettings, defaultNormalization}, method) =>
	method
	/*shouldNormalize(vizSettings, defaultNormalization) ?
		(ctx, search, data) => method(ctx, addMeanOrNull(search, data.req.mean[0]), data) :
			(shouldLog(vizSettings, defaultNormalization) ?
				(ctx, search, data) => method(ctx, power2XplusOneOrNull(search), data) : method)*/
	);

function searchAll(ctx, methods, search) {
	let {cohortSamples, columns, data} = ctx;
	return _.union(..._.map(columns, (c, key) => normalizeSearch(c, methods[c.valueType])(ctx, search, data[key])),
				   methods.samples(cohortSamples, search));
}

function evalFieldExp(ctx, expression, column, data) {
	if (!column || !_.get(data, 'req')) {
		return [];
	}
	var n = normalizeSearch(column);
	return m({
		value: search => n(searchMethod[column.valueType])(ctx, search, data),
		'quoted-value': search => n(searchExactMethod[column.valueType])(ctx, search, data),
		ne: exp => invert(evalFieldExp(ctx, exp, column, data), ctx.allSamples),
		lt: search => n(searchLt[column.valueType])(ctx, search, data),
		gt: search => n(searchGt[column.valueType])(ctx, search, data),
		le: search => n(searchLe[column.valueType])(ctx, search, data),
		ge: search => n(searchGe[column.valueType])(ctx, search, data)
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

function searchSamples(search, columns, columnOrder, data, cohortSamples) {
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
		group: exp => `(${treeToString(exp)})`,
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
		tree = parse(_s.trim(exp));
	return treeToString(remapTreeFields(tree, mapping));
}

/*
var columnShouldNormalize = ({vizSettings, defaultNormalization}) =>
	shouldNormalize(vizSettings, defaultNormalization);

var columnShouldLogXPlusOne = ({vizSettings, defaultNormalization}) =>
	shouldLog(vizSettings, defaultNormalization);

var fieldId = (order, colId) => createFieldIds(order.length)[order.indexOf(colId)];
*/

var rewriteFieldExpression = (norm, mean, exp) =>
	m({
		ne: iexp => ['ne', rewriteFieldExpression(norm, mean, iexp)]
	}, exp, ([op, value]) => [op, '' + (parseFloat(value) + (norm ? -mean : mean))]);

var rewriteFieldExpressionLog = (log, exp) =>
	m({
		ne: iexp => ['ne', rewriteFieldExpressionLog(log, iexp)]
	}, exp, ([op, value]) => [op, '' + (log ? Math.log2(parseFloat(value) + 1) : (Math.pow(2, parseFloat(value)) - 1))]);

var changeFieldNorm = _.curry((id, norm, mean, tree) =>
	m({
		and: (...factors) => ['and', ..._.map(factors, changeFieldNorm(id, norm, mean))],
		or: (...terms) => ['or', ..._.map(terms, changeFieldNorm(id, norm, mean))],
		field: (field, exp) =>
			['field', field, id === field ? rewriteFieldExpression(norm, mean, exp) : exp]
	}, tree, _.identity));

var changeFieldLog = _.curry((id, log, tree) =>
	m({
		and: (...factors) => ['and', ..._.map(factors, changeFieldLog(id, log))],
		or: (...terms) => ['or', ..._.map(terms, changeFieldLog(id, log))],
		field: (field, exp) =>
			['field', field, id === field ? rewriteFieldExpressionLog(log, exp) : exp]
	}, tree, _.identity));


// If transformation has change, rewrite the search expression so the matching
// range remains the same.
function checkFieldExpression(oldColumn, newColumn, id, order, data, exp) {
	return exp;
	/*
	var oldLog = columnShouldLogXPlusOne(oldColumn),
		newLog = columnShouldLogXPlusOne(newColumn);

	if (oldLog === newLog) {
		return exp;
	} else if (oldLog !== newLog) { // log(x+1) <-> none
		return treeToString(changeFieldLog(fieldId(order, id), newLog, parse(_s.trim(exp))));
	}
	*/
}

module.exports = {
	searchSamples,
	treeToString,
	remapFields,
	checkFieldExpression,
	parse
};
