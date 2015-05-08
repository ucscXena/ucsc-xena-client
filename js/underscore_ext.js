/*eslint strict: [2, "function"] */
/*globals define: false, console: false */
define(['underscore', 'immutable', 'defer'], function(_, immutable, defer) {
	'use strict';

	var slice = Array.prototype.slice;

	_.mixin({defer: defer}); // override underscore defer
	_.mixin(immutable);       // add immutable methods

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

	// Concat array with following arguments
	function concat(arr) {
		return arr.concat(slice.call(arguments, 1));
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

	_.mixin({
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
		maxWith: maxWith
	});

	return _;
});
