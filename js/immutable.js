/*global define: false */
define([], function() {
	'use strict';
	var hasOwnProperty = Object.prototype.hasOwnProperty,
		slice = Array.prototype.slice;

	function has(obj, prop) {
		return hasOwnProperty.call(obj, prop);
	}
		
	// Immutable collection operations, based on doing a naive
	// path copy. Should be performant for objects that are not
	// too large, and nesting not too deep.

	function arrAssoc(x, k, v) {
		var y;
		if (k < 0 || k > x.length) {
			throw new Error('Index ' + k + ' out of bounds [0,' + x.length + ']');
		}
		y = [].concat(x);
		y[k] = v;
		return y;
	}

	function objAssoc(x, k, v) {
		/*jslint forin: true */
		var y = {}, i;
		x = x || {};
		for (i in x) {
			if (has(x, i)) {
				y[i] = x[i];
			}
		}
		y[k] = v;
		return y;
	}

	function dissoc(x, k) {
		/*jslint forin: true */
		if (!has(x, k)) { // avoid new object if we can.
			return x;
		}
		var y = {}, i;
		for (i in x) {
			if (has(x, i) && i !== k) {
				y[i] = x[i];
			}
		}
		return y;
	}

	function assoc1(x, k, v) {
		if (x && x[k] === v) { // avoid new object if we can.
			return x;
		}
		if (x instanceof Array) {
			return arrAssoc(x, k, v);
		} 
		return objAssoc(x, k, v);
	}

	function assoc(x) {
		var kvs;

		for (kvs = slice.call(arguments, 1); kvs.length; kvs = kvs.slice(2)) {
			x = assoc1(x, kvs[0], kvs[1]);
		}
		return x;
	}

	function assoc_in_i(x, keys, v, i) {
		var ki = keys[i];
		if (keys.length === i + 1) {
			return assoc(x, ki, v);
		}
		return assoc(x, ki, assoc_in_i(x && x[ki], keys, v, i + 1));
	}

	function assoc_in(x, keys, v) {
		return assoc_in_i(x, keys, v, 0);
	}

	function conj(x, v) {
		if (x instanceof Array) {
			return assoc(x, x.length, v);
		}
		return assoc(x, v[0], v[1]);
	}

	function update_in_i(x, keys, fn, i) {
		var ki = keys[i];
		if (keys.length === i + 1) {
			return assoc(x, ki, fn(x && x[ki]));
		}
		return assoc(x, ki, update_in_i(x && x[ki], keys, fn, i + 1));
	}

	function update_in(x, keys, fn) {
		return update_in_i(x, keys, fn, 0);
	}

	function get_in_i(x, keys, i) {
		var ki;

		if (x === null || x === undefined) {
			return x;
		}
		ki = keys[i];
		if (keys.length === i + 1) {
			return x[ki];
		}
		return get_in_i(x[ki], keys, i + 1);
	}

	function get_in(x, keys) {
		if (keys.length === 0) {
			return x;
		}
		return get_in_i(x, keys, 0);
	}


	return {
		assoc: assoc,
		assoc_in: assoc_in,
		dissoc: dissoc,
		update_in: update_in,
		conj: conj,
		get_in: get_in
	};
});
