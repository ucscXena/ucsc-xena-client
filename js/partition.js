/*jslint nomen:true, indent: 4 */
/*global define: false  */

define(['underscore'], function (_) {
	'use strict';

	// XXX These recursive methods are going to suck for performance & eating memory
	// when the sizes array gets big.

	// Partition n bins (e.g. pixels) proportional to sizes,
	// distributing bins that won't evenly divide.
	//
	// total is optional & should be the sum of sizes.
	function bysize(n, sizes, total) {
		if (sizes.length === 1) {
			return [n];
		}
		total = total || _(sizes).reduce(function (x, y) { return x + y; });
		var p = Math.round(sizes[0] * n / total); // this bysize size.
		return [ p ].concat(bysize(n - p, _(sizes).rest(1), total - sizes[0])); // XXX performance
	}

	// Tail recursive version.
	/*
	var equally = function (n, m, c) {
		c = c || [];
		if (m === 0)
			return c;
		var p = Math.round(n/m);
		c.push(p);
		return equally(n - p, m - 1, c);
	};
	*/

	function equally(n, m) {
		var c = [],
			p;
		while (m) {
			p = Math.round(n / m);
			c.push(p);
			n = n - p;
			m = m - 1;
		}
		return c;
	}

	// Same as bysize, but return array of objects with start & size.
	// "sizes" can be an array of sizes, or a count (for equal bysize)
	function offsets(n, sep, sizes) {
		var fn,
			cut,
			parts,
			offset;
		if (_.isArray(sizes)) {
			fn = bysize;
			cut = sep * (sizes.length - 1);
		} else {
			fn = equally;
			cut = sep * (sizes - 1);
		}
		parts = fn(n - cut, sizes);
		offset = 0;
		return _(parts).map(function (size) {
			var ret = {
				start : offset,
				size: size
			};
			offset = offset + size + sep; // XXX assumes map() iterates in order
			return ret;
		});
	}

	return {
		bysize: bysize,
		equally: equally,
		offsets: offsets
	};

});
