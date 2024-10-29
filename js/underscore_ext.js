
var _ = require('underscore');
var ehmutable = require('ehmutable');
var defer = require('./defer');
// react fiber code creates data structures with cycles, which breaks
// this fast equality check. Need to modify it to check for cycles
// (potentially defeating the performance boost) or add special handling of
// react elements.
//var fastDeepEqual = require('fast-deep-equal');

var slice = Array.prototype.slice;

_.mixin({defer: defer});    // override underscore defer
_.mixin(ehmutable.init(_)); // add immutable methods

function fmap(m, fn) {
	var x = {};
	_.each(m, function (v, k) { x[k] = fn(v, k); });
	return x;
}

// Return function that takes an array
function apply(fn, self) {
	return fn.apply.bind(fn, self);
}

// Create array from arguments
function array() {
	return _.toArray(arguments);
}

// Concat arrays
function concat(...arrs) {
	return [].concat(...arrs);
}

function pluckPaths(paths, obj) {
	return _.fmap(paths, _.partial(_.getIn, obj));
}

function pluckPathsArray(paths, obj) {
	return _.map(paths, _.partial(_.getIn, obj));
}

function partitionN(arr, n, step, pad) {
	var i, last, len, ret = [];

	step = step || n;
	for (i = 0; i < arr.length; i += step) {
		ret.push(arr.slice(i, i + n));
	}

	last = ret[ret.length - 1];
	if (last) {
		len = last.length;
		if (pad && len < n) {
			ret[ret.length - 1] = last.concat(pad.slice(0, n - len));
		}
	}
	return ret;
}

function objectFn(keys, fn) {
	return _.reduce(keys, function (acc, k) {
		acc[k] = fn(k);
		return acc;
	}, {});
}

/* Like _.find, but return the result of the predicate */
function findValue(obj, predicate, context) {
	var result;
	_.any(obj, function (value, index, list) {
		result = predicate.call(context, value, index, list);
		return result;
	});
	return result;
}

// XXX Drop this when upgrading underscore
function negate(predicate) {
	return function () {
		return !predicate.apply(this, slice.call(arguments, 0));
	};
}

function spy(msg, x) {
	if (console) {
		console.log(msg, x);
	}
	return x;
}

// Find max using a cmp function. Same as arr.slice[0].sort(cmp)[0],
// but O(n) instead of O(n log n).
function maxWith(arr, cmp) {
	return _.reduce(arr, function (x, y) {
		return cmp(x, y) < 0 ? x : y;
	});
}

function memoize1(fn) {
	var last = null,
		lastParams = null;
	return function () {
		if (!_.isEqual(arguments, lastParams)) {
			last = fn.apply(this, arguments);
			lastParams = arguments;
		}
		return last;
	};
}

function meannull(values) {
	if (!values) {
		return null;
	}
	var count = 0, sum = 0, len = values.length, v;
	for (var i = 0; i < len; ++i) {
		v = values[i];
		if (!isNaN(v)) {
			count += 1;
			sum += v;
		}
	}
	if (count > 0) {
		return sum / count;
	}
	return null;
}

// Version that works with iterables. Not using it for now
// due to babel generator performance. See below.
//function meannull(values) {
//	var count = 0, sum = 0;
//	if (!values) {
//		return null;
//	}
//	for (let v of values) {
//		if (v != null) {
//			count += 1;
//			sum += v;
//		}
//	}
//	return (count > 0) ? sum / count : null;
//}

function cmpNumberOrNull(v1, v2) {
	if (isNaN(v1) && isNaN(v2)) {
		return 0;
	} else if (isNaN(v1)) {
		return 1;
	} else if (isNaN(v2)) {
		return -1;
	}
	return v2 - v1;
}

function firstNaNIndex(arr) {
	var l = arr.length;
	for (var i = 0; i < l; ++i) {
		if (isNaN(arr[i])) {
			return i;
		}
	}
	return -1;
}

function medianNull(values) {
	if (!values) {
		return null;
	}
	var sorted = values.slice(0).sort(cmpNumberOrNull),
		firstNaN = firstNaNIndex(values),
		notNaN = firstNaN !== -1 ? sorted.slice(0, firstNaN) : sorted,
		n = notNaN.length;

	return (notNaN[Math.ceil((n - 1) / 2)] + notNaN[Math.floor((n - 1) / 2)]) / 2;
}

function fmapMemoize1(fn) {
	var prevObj = {}, cache = {};
	return function memoized(obj) {
		// Preserve reference equality when input is the same.
		if (_.isEqual(obj, prevObj)) {
			return cache;
		}
		var next = _.mapObject(obj, (val, key) =>
				_.isEqual(prevObj[key], val) ? cache[key] : fn(val, key));

		// If all values are the same, preserve reference equality.
		// XXX this is weird.
		cache = _.isEqual(next, cache) ? cache : next;
		prevObj = obj;
		return cache;
	};
}

function curry2(fn) {
	return function(a, b) {
		switch (arguments.length) {
			case 1:
				return b => fn(a, b);
			// use 'default', not 2, to catch & discard extra params.
			default:
				return fn(a, b);
		}
	};
}

function curry3(fn) {
	return function(a, b, c) {
		switch (arguments.length) {
			case 1:
				return function(b, c) {
					switch (arguments.length) {
						case 1:
							return c => fn(a, b, c);
						// use 'default', not 2, to catch & discard extra params.
						default:
							return fn(a, b, c);
					}
				};
			case 2:
				return c => fn(a, b, c);
			// use 'default', not 3, to catch & discard extra params.
			default:
				return fn(a, b, c);
		}
	};
}

function curryArgs(args, accN, fn) {
	var n = args.length;
	return function() {
		var m = arguments.length,
			sum = accN + m;
		for (var i = 0; i < m; ++i) {
			args[accN + i] = arguments[i];
		}
		return sum >= n ? fn(...args) :
			// every new curry must have its own copy of the args array.
			curryArgs(args.slice(0), sum, fn);
	};
}

// this no longer handles extra args passed to the fn. Should we care?
function curryN(n, fn) {
	// Unroll the most common cases.
	switch (n) {
		case 1: return fn;
		case 2: return curry2(fn);
		case 3: return curry3(fn);
	}
	return curryArgs(new Array(n), 0, fn);
}

function mmapper(cols, n, fn) {
	// Unroll the most common cases.
	switch (n) {
		// case 1 looks like a noop, i.e. we could return fn. However _.map also passes 'this', which
		// messes us up.
		case 1: return (v0, i) => fn(v0, i);
		case 2: return (v0, i) => fn(v0, cols[1][i], i);
		case 3: return (v0, i) => fn(v0, cols[1][i], cols[2][i], i);
		case 4: return (v0, i) => fn(v0, cols[1][i], cols[2][i], cols[3][i], i);
	}
	var buff = new Array(n + 1); // reuse buffer to avoid allocation
	return (v0, i) => {
		for (var j = 0; j < n; ++j) {
			buff[j] = cols[j][i];
		}
		buff[j] = i;
		return fn(...buff);
	};
}

function mmap(...args) {
	var fn = args[args.length - 1];
	return (args[0] || []).map(mmapper(args, args.length - 1, fn));
}

function scanI(arr, fn, acc, i, out) {
	if (i >= arr.length) {
		return out;
	}
	var next = fn(acc, arr[i]);
	out.push(next);
	return scanI(arr, fn, next, i + 1, out);
}

function scan(arr, fn, acc) {
	if (arguments.length < 3) {
		if (arr.length === 0) {
			throw new Error("scan of empty array with no initial value");
		}
		return scanI(arr, fn, arr[0], 1, [arr[0]]);
	}
	return scanI(arr, fn, acc, 0, [acc]);
}

var curry = fn => curryN(fn.length, fn);

var withoutIndex = (arr, i) => arr.slice(0, i).concat(arr.slice(i + 1));

// Return indices of arr for which fn is true. fn is passed the value and index.
var filterIndices = (arr, fn) => _.range(arr.length).filter(i => fn(arr[i], i));

// non-destructive reverse
var reverse = arr => arr.slice(0).reverse();

// Group by consecutive matches, perserving order.
function groupByConsec(sortedArray, prop, ctx) {
	var cb = _.iteratee(prop, ctx);
	var last = {}, current; // init 'last' with a sentinel, !== to everything
	return _.reduce(sortedArray, (acc, el) => {
		var key = cb(el);
		if (key !== last) {
			current = [];
			last = key;
			acc.push(current);
		}
		current.push(el);
		return acc;
	}, []);
}

function findIndexDefault(arr, pred, def) {
	var i = _.findIndex(arr, pred);
	return i < 0 ? def : i;
}

function findLastIndexDefault(arr, pred, def) {
	var i = _.findLastIndex(arr, pred);
	return i < 0 ? def : i;
}

// underscore uniq is absurdly slow
var uUniq = _.uniq;
function unique(arr, ...rest) {
	if (rest.length > 0) {
		return uUniq(arr, ...rest);
	}
	return [...new Set(arr)];
}

function duplicates(arr) {
	var sorted = arr.sort(),
		result = [];

	for(var i = 1; i < sorted.length; i++) {
		if (arr[i - 1] === arr[i]) {
			result.push(arr[i]);
		}
	}
	return result;
}

// underscore union is slow, due to n^2 algorithm using _.contains.
// Perserves order by using unique(), which preserves order by use of
// Set.
function union(...args) {
	var flattened = args.reduce((a, b) => a.concat(b), []);
	return unique(flattened);
}

// underscore intersection is slow, due to n^2 algorithm using _.contains.
function intersection(...args) {
	if (!args.length) {
		return [];
	}
	// start with shortest list
	args.sort((a, b) => a.length - b.length);
	var f = args.shift();
	while (f.length && args.length) {
		var n = new Set(args.shift());
		f = f.filter(v => n.has(v));
	}
	return f;
}

// make unique by appending numbered suffix
function uniquify(strs) {
	var counts = {};
	return strs.map(s => {
		var c = counts[s] = _.has(counts, s) ? counts[s] + 1 : 0;
		return c > 0 ? `${s} (${c})` : s;
	});
}

var insert = (arr, i, vals) => [...arr.slice(0, i), ...vals, ...arr.slice(i)];
// immutable splice
var splice = (arr, i, c, ...vals) => {
	var ret = arr.slice(0);
	ret.splice(i, c, ...vals);
	return ret;
};

function listSetsEqual(l1, l2) {
	if (l1.length !== l2.length) {
		return false;
	}
	var s1 = new Set(l1);
	return _.every(l2, v => s1.has(v));
}

// Return paths in obj which match path, where path is a path array
// of form [key | matchKeys.any, key | matchKeys.any, ...].
// key will match a literal string key. any will match any key.
// E.g. ['a', matchKey.any] will match ['a', 'b'], ['a', 'c'] in
// {a: {b: 0, c: 1}}
var any = {};
var matchKeys = (obj, path, i = 0) =>
	i === path.length ? [path] :
	path[i] === any ? Object.keys(obj)
		.map(k => matchKeys(obj[k], splice(path, i, 1, k), i + 1)).flat() :
	!obj.hasOwnProperty(path[i]) ? [] :
	matchKeys(obj[path[i]], path, i + 1);

matchKeys.any = any;

var matchPath = (pattern, path) =>
	pattern.every((k, i) => pattern[i] === path[i] || pattern[i] === any);

matchPath.any = any;

function anyRange(coll, start, end, pred = _.identity, i = start) {
	return i === end ? false :
		pred(coll[i]) ? true :
		anyRange(coll, start, end, pred, i + 1);
}

// In theory one could apply zip, but 'apply' will blow the
// stack on chrome.
var transpose = coll =>
	!coll || !coll.hasOwnProperty('length') ? [] :
	coll.length === 0 ? coll :
	coll[0].map((v, i) => coll.map(line => line[i]));

// mutating 'push' that returns the array
var push = (arr, v) => (arr.push(v), arr);

var sorted = (arr, ...args) => arr.slice(0).sort(...args);

// Starting some iterator methods here, but there are some performance
// concerns. babel generators are slow, possibly due to injecting a try/catch.
//
//function* imap(arr, fn) {
//	for (let v of arr) {
//		yield fn(v);
//	}
//}
//

// Iterable version. Wow, this is ugly.
function imap(iterable, fn) {
	return {
		[Symbol.iterator]: (iter = iterable[Symbol.iterator]()) => ({
			next: () => {
				var n = iter.next();
				return n.done ? {done: true} : {value: fn(n.value)};
			}
		})
	};
}

// repeat an iterable n times.
function* repeat(n, iterable) {
	while (n--) {
		yield* iterable[Symbol.iterator]();
	}
}

function valToStr(v) {
	return (!isNaN(v) && (v !== null) && (v !== undefined)) ? "" + v : "";
}

var mergable = o => _.isObject(o) && !_.isFunction(o);

function deepMerge1(a, b) {
	_.keys(b).forEach(k => {
		var ak = _.get(a, k),
			v = mergable(ak) && mergable(b[k]) ?
				deepMerge1(ak, b[k]) : b[k];
		a = _.assoc(a, k, v);
	});
	return a;
}

// immutably deep merge nested objects, retaining identity if value is unchanged.
// Doesn't handle complex types, e.g. typed arrays, Date, Map, Set.
function deepMerge(a, ...args) {
	args.forEach(arg => {
		a = deepMerge1(a, arg);
	});
	return a;
}

// string slice() will hold a copy of the original string, which
// will run us out of memory when processing buffers. So, force
// a mem copy.
var copyStr = str => (' ' + str).slice(1);

//
//function* irange(n) {
//	for (let i = 0; i < n; ++i) {
//		yield i;
//	}
//}
//
//// tack on an iterator namespace. We should probably find a better
//// functional methods library that supports iterators.
_.iterable = {
	map: imap,
	repeat
};

_.mixin({
	anyRange,
	apply,
	array,
	concat,
	copyStr,
	cmpNumberOrNull,
	curry,
	curryN, // useful if the fn as multiple arities.
	deepMerge,
	duplicates,
	filterIndices,
	findIndexDefault,
	findLastIndexDefault,
	findValue,
	flatmap: _.compose(_.partial(_.flatten, _, 1), _.map),
	fmap,
	fmapMemoize1,
	groupByConsec,
	insert,
	intersection,
//	isEqual: fastDeepEqual,
	listSetsEqual,
	matchKeys,
	matchPath,
	maxWith,
	meannull,
	medianNull,
	memoize1,
	merge: (...args) => _.extend.apply(null, [{}].concat(args)),
	mmap,
	negate,
	objectFn,
	partitionN,
	pluckPaths,
	pluckPathsArray,
	push,
	reverse,
	scan,
	splice,
	sorted,
	spy,
	sum: arr => _.reduce(arr, (x, y) => x + y, 0),
	transpose,
	union,
	uniq: unique,
	unique,
	uniquify,
	withoutIndex,
	valToStr,
	// This inscrutable method allows one to write a 'let' expression via
	// es6 default arguments, e.g. _.Let((x = 5, y = x + 2) => x + y) === 12
	Let: f => f()
});

export default _;
