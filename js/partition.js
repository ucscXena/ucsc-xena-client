'use strict';

var _ = require('./underscore_ext');

// Partition n bins (e.g. pixels) proportional to sizes,
// distributing bins that won't evenly divide.
//
// total is optional & should be the sum of sizes.
function bysize(n, sizes, total = _.sum(sizes)) {
	return sizes.map(size => {
		var p = Math.round(size * n / total);
		n -= p;
		total -= size;
		return p;
	});
}

function equally(n, m) {
	var starts = _.times(m, i => Math.round(i * n / m));
	return _.map(starts, (s, i) => (i === m - 1 ? n : starts[i + 1]) - s);
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
			start: offset,
			size: size
		};
		offset = offset + size + sep; // XXX assumes map() iterates in order
		return ret;
	});
}

module.exports = {
	bysize,
	equally,
	offsets
};
