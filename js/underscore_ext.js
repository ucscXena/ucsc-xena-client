/*globals define: false */
define(['lib/underscore', 'immutable', 'defer'], function(_, immtable, defer) {
	'use strict';

	var slice = Array.prototype.slice;

	_.mixin({defer: defer}); // override underscore defer
	_.mixin(immtable);       // add immutable methods

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
		return _.fmap(paths, _.partial(_.get_in, obj));
	}

	function partition_n(arr, n, step, pad) {
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



	_.mixin({
		fmap: fmap,
		apply: apply,
		pluckPaths: pluckPaths,
		array: array,
		concat: concat,
		partition_n: partition_n
	});


	return _;
});
