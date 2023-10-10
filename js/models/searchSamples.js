var _ = require('../underscore_ext').default;
var {parse} = require('./searchParser');
import {setUserCodes} from './denseMatrix';
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

function evalexp(ctx, expression) {
	return m({
		value: search => searchAll(ctx, searchMethod, search),
		'quoted-value': search => searchAll(ctx, searchExactMethod, search),
		// 'ne' is also 'not'
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
		cross: exprs => _.map(exprs, treeToString).join(' ; '),
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

function evalsearch(ctx, search) {
	var prefix = search.length - search.trimStart().length;
	var expr = parse(search.trim());
	var [/*cross*/, exprs, offsets] = expr;
	return {
		exprs: exprs.map(treeToString),
		matches: exprs.map(exp => evalexp(ctx, exp)),
		offsets: offsets.map(o => o + prefix)
	};
}

const A = 'A'.charCodeAt(0);
var toFieldId = i => String.fromCharCode(i + A);

function createFieldIds(len) {
	return _.times(len, toFieldId);
}

function createFieldMap(columnOrder) {
	return _.object(createFieldIds(columnOrder.length), columnOrder);
}

var setUserCodesAll = (columns, data) =>
	_.mapObject(data, (d, id) => setUserCodes(columns[id], d));

function searchSamples(search, columns, columnOrder, dataIn, cohortSamples) {
	if (!_.get(search, 'length')) {
		return {exprs: null, matches: null};
	}
	let fieldMap = createFieldMap(columnOrder),
		sampleCount = _.get(cohortSamples, 'length'),
		data = setUserCodesAll(columns, dataIn);
	try {
		return evalsearch({columns, data, fieldMap, cohortSamples, sampleCount}, search);
	} catch(e) {
		console.log('parsing error', e);
		return {exprs: [], matches: [[]]};
	}
}

function remapTreeFields(tree, mapping) {
	return m({
		cross: exprs => ['cross', _.map(exprs, t => remapTreeFields(t, mapping))],
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
var remapFields = _.curry((oldOrder, order, exp) => {
	if (!_.get(exp, 'length')) {
		return null;
	}
	try {
		var tree = parse(exp.trim());
	} catch {
		return null;
	}
	var fieldIds = createFieldIds(order.length),
		oldFieldMap = _.invert(createFieldMap(oldOrder)),
		newOrder = _.map(order, uuid => oldFieldMap[uuid]),
		mapping = _.object(newOrder, fieldIds);
	return treeToString(remapTreeFields(tree, mapping));
});

function extendUp({index, count}, pred) {
	var start = index, i;
	for (i = index + 1; i < index + count; ++i) {
		if (pred(start, i)) {
			break;
		}
	}
	return {
		start,
		end: i
	};
}

function extendDown({index, count}, pred) {
	var end = index + count, i;
	for (i = end - 2; i >= index; --i) {
		if (pred(end - 1, i)) {
			break;
		}
	}
	return {
		start: i + 1,
		end,
	};
}

function equalMatrix(data, index, samples, s0, s1) {
	var values = _.getIn(data, ['req', 'values']);
	return values.length > 1 ? false :
		values[0][samples[s0]] === values[0][samples[s1]];
}

function equalFalse() {
	return false;
}

var mutationRegion = list =>
	list == null ? 'null' :
	list.length === 0 ? 'none' :
	'mutation';

// Allow drag in null and no-mutation areas, but not in
// mutations, because the mutations fix the subsort, and
// the resulting expression wouldn't make much sense.
function equalMutation(data, index, samples, s0, s1) {
	var r0 = mutationRegion(index.bySample[samples[s0]]),
		r1 = mutationRegion(index.bySample[samples[s1]]);

	return r0 === r1 && r0 !== 'mutation';
}

function equalSegmented(data, index, samples, s0, s1) {
	var values = _.getIn(data, ['avg', 'values']);
	return values[0][samples[s0]] === values[0][samples[s1]];
}


// These methods are used to clip the pick region, by enforcing
// that values in columns on the left are "equal". Otherwise we
// get weird combinatorical expressions when dragging across different
// values on the left.
var equalMethod = {
	coded: equalMatrix,
	float: equalMatrix,
	mutation: equalMutation,
	segmented: equalSegmented,
	samples: equalFalse
};

var codeOrNull = (codes, val) => val == null ? 'null' : `"${codes[val]}"`;

function matchEqualCoded(data, index, samples, id, s) {
	var {req: {values: [field]}, codes} = data;
	return `${id}:${codeOrNull(codes, field[samples[s]])}`;
}

function matchEqualFloat(data, index, samples, id, s) {
	if (_.every(data.req.values, field => field[samples[s]] == null)) {
		return `${id}:=null`;
	}
	if (data.req.values.length !== 1) {
		return '';
	}
	var {req: {values: [field]}} = data;
	return `${id}:=${field[samples[s]]}`;
}

function matchEqualSegmented(data, index, samples, id, s) {
	var {avg: {values: [field]}} = data;
	return `${id}:=${field[samples[s]]}`;
}

var mutationMatches = {
	null: id => `${id}:=null`,
	none: id => `${id}:!=chr ${id}:!=null`,
	mutation: id => `${id}:=chr`
};

function matchEqualMutation(data, index, samples, id, s) {
	return mutationMatches[mutationRegion(index.bySample[samples[s]])](id);
}

var matchEqualMethod = {
	coded: matchEqualCoded,
	float: matchEqualFloat,
	mutation: matchEqualMutation,
	segmented: matchEqualSegmented,
	samples: matchEqualCoded
};

function matchRangeCoded(data, index, samples, id, start, end, first) {
	var {req: {values: [field]}, codes} = data,
		matches = _.uniq(_.range(start, end).map(i => field[samples[i]]))
			.map(v => codeOrNull(codes, v)),
		terms = matches.map(c => `${id}:${c}`).join(' OR ');

	return first || matches.length === 1 ? terms : `(${terms})`;
}

function matchRangeFloat(data, index, samples, id, start, end) {
	// XXX review meaning of null on multivalued columns
	if (_.every(data.req.values, field => field[samples[start]] == null)) {
		return `${id}:=null`;
	}
	if (data.req.values.length !== 1) {
		return '';
	}
	var {req: {values: [field]}} = data,
		matches = [start, end - 1].map(i => field[samples[i]]),
		max = _.max(matches),
		min = _.min(matches);
	return `${id}:>=${min} ${id}:<=${max}`;
}

function matchRangeMutation(data, index, samples, id, start, end, first) {
	var regions = {};
	_.range(start, end).forEach(s => {
		regions[mutationRegion(index.bySample[samples[s]])] = true;
	});
	var terms = Object.keys(regions).map(r => mutationMatches[r](id)).join(' OR ');

	return first || terms.length === 1 ? terms : `(${terms})`;
}

function matchRangeSegmented(data, index, samples, id, start, end) {
	if (_.every(data.avg.values, field => field[samples[start]] == null)) {
		return `${id}:=null`;
	}
	var {avg: {values: [field]}} = data,
		matches = [start, end - 1].map(i => field[samples[i]]),
		max = _.max(matches),
		min = _.min(matches);
	return `${id}:>=${min} ${id}:<=${max}`;
}

var matchRangeMethod = {
	coded: matchRangeCoded,
	float: matchRangeFloat,
	mutation: matchRangeMutation,
	segmented: matchRangeSegmented,
	samples: matchRangeCoded
};

var nullMismatchMethod = {
	float: (data, s0, s1) =>
		// XXX review meaning of null on multivalued columns
		(data.req.values[0][s0] == null) !== (data.req.values[0][s1] == null),
	coded: () => false,
	mutation: () => false,
	segmented: (data, s0, s1) =>
		(data.avg.values[0][s0] == null) !== (data.avg.values[0][s1] == null)
};

function pickSamplesFilter(flop, dataIn, indexIn, samples, columnsIn, id, range) {
	// This weirdness is special handling for drag on sampleID. Normally
	// we don't consider sampleID for the filter range, so we slice(1) the
	// columns and data to skip it. If the user specifically drags on the
	// sampleIDs then we leave it in, but it's the only column. We use
	// the original column count, columnsIn.length, for setting the field id.
	var [columns, data, index] =
		columnsIn.length === 1 ? [columnsIn, dataIn, indexIn] :
		[columnsIn.slice(1), dataIn.slice(1), indexIn.slice(1)];
	var leftCols = _.initial(columns),
		thisCol = _.last(columns);
	var neq = (mark, i) =>
			nullMismatchMethod[thisCol.valueType](_.last(data), samples[mark], samples[i]) ||
			!_.every(leftCols,
					(column, j) => equalMethod[column.valueType](data[j], index[j], samples, mark, i));

	// XXX Note that these methods will behave badly on null data in singlecell branch, due to
	// NaN !== NaN.
	var {start, end} = (flop ? extendDown : extendUp)(range, neq);

	return leftCols.map((column, i) => matchEqualMethod[column.valueType](data[i], index[i], samples,
				toFieldId(i + 1), start)).join(' ') + (leftCols.length ? ' ' : '') +
			matchRangeMethod[thisCol.valueType](_.last(data), _.last(index), samples,
					toFieldId(columnsIn.length - 1), start, end, leftCols.length === 0);
}


var subsortableMethod = {
	coded: (column, data) => data.req,
	float: (column, data, index, samples, si) => data.req &&
		data.req.values.length === 1  && data.req.values[0][samples[si]] == null,
	segmented: (column, data, index, samples, si) => data.avg &&
		data.avg.values.length === 1  && data.avg.values[0][samples[si]] == null,
	mutation: (column, data, index, samples, si) => data.req &&
		_.isEmpty(index.bySample[samples[si]])
};

var subsortable = (column, ...args) => subsortableMethod[column.valueType](column, ...args);

var sortableMethod = {
	coded: (column, data) => data.req,
	float: (column, data) => data.req && data.req.values.length === 1,
	segmented: (column, data) => data.avg,
	mutation: (column, data, index, samples, si) => data.req &&
		_.isEmpty(index.bySample[samples[si]])
};
var sortable = (column, ...args) => sortableMethod[column.valueType](column, ...args);

function canPickSamples(columns, data, index, samples, columnOrder, id, si) {
	if (id === columnOrder[0]) { // sampleIDs
		return true;
	}

	var canSubsort = _.every(_.range(1, columnOrder.indexOf(id)), c => {
		var id = columnOrder[c];
		return subsortable(columns[id], data[id], index[id], samples, si);
	});

	return canSubsort && sortable(columns[id], data[id], index[id], samples, si);
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
	pickSamplesFilter,
	canPickSamples,
	parse,
	invert
};
