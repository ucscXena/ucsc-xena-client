/*eslint strict: [2, "function"] */
/*globals define: false, console: false */
define(['underscore', 'ehmutable', './defer'], function(_, ehmutable, defer) {
	'use strict';

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

	// Concat array with following arrays
	function concat(arr, ...arrs) {
		return arr.concat(...arrs);
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
		var count = 0, sum = 0;
		if (!values) {
			return null;
		}
		sum = _.reduce(values, function (sum, v) {
			if (v != null) {
				count += 1;
				return sum + v;
			}
			return sum;
		}, 0);
		if (count > 0) {
			return sum / count;
		}
		return null;
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

	function mmapper(cols, fn) {
		var n = cols.length;
		// Unroll the most common cases.
		switch (n) {
			case 1: return fn;
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
		var cols = args.slice(0, args.length - 1),
			fn = args[args.length - 1];
		return _.map(cols[0], mmapper(cols, fn));
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

	_.mixin({
		meannull: meannull,
		minnull: arr => _.min(arr, v => v == null || isNaN(v) ? Infinity : v),
		maxnull: arr => _.max(arr, v => v == null || isNaN(v) ? -Infinity : v),
		memoize1: memoize1,
		fmap: fmap,
		apply: apply,
		pluckPaths: pluckPaths,
		pluckPathsArray: pluckPathsArray,
		array: array,
		concat: concat,
		partitionN: partitionN,
		objectFn: objectFn,
		findValue: findValue,
		negate: negate,
		spy: spy,
		flatmap: _.compose(_.partial(_.flatten, _, 1), _.map),
		merge: (...args) => _.extend.apply(null, [{}].concat(args)),
		maxWith: maxWith,
		sum: arr => _.reduce(arr, (x, y) => x + y, 0),
		scan,
		fmapMemoize1,
		mmap,
		withoutIndex,
		filterIndices,
		curry,
		curryN // useful if the fn as multiple arities.
	});

	return _;
});
