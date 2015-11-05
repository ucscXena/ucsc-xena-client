/*global require: false, module: false */
'use strict';

var _ = require('underscore');

// We could use d3 for scale & ticks. Avoiding it here because
// of wanting to minimize dependencies, it's more than we need,
// and there are performance issues with d3 color scales when
// the data is largish.


// linear scale

function linear([dstart,  dend], [rstart, rend]) { // (domain, range)
	return dend > dstart ?
		(x =>
			x < dstart ? rstart :
				(x > dend ? rend :
					(x - dstart) * (rend - rstart) / (dend - dstart) + rstart)) :
		(x =>
			x > dstart ? rstart :
				(x < dend ? rend :
					(x - dstart) * (rend - rstart) / (dend - dstart) + rstart));
}

function swapInv(start, end) {
	return start > end ? [end, start] : [start, end];
}

function linearTicks(start, end) {
	var [low, high] = swapInv(start, end),
		[, digit, exp] = (high - low).toExponential()
			.match(/-?([0-9])[0-9.]*e([+-][0-9]+)/),
		nticks = parseInt(digit, 10) + 1, // first significant digit plus 1
		                                  // e.g. 0-2.3 will have ticks 0,1,2
		scale = Math.pow(10, exp),
		t;

	// For digit n, there will be n + 1 nticks if using 1 * scale.
	if (nticks > 9) {       // 10 nticks. Halve it by doubling scale.
		t = scale * 2;
	} else if (nticks > 4) {
		t = scale;          // 5 or more nticks at scale, which is fine.
	} else if (nticks > 2) {
		t = 0.5 * scale;    // 3-4 nticks, use half scale to get 6-8
	} else {
		t = 0.25 * scale;   // 1-2 nticks, use quarter scale to get 4-8
	}

	return _.range(Math.ceil(low / t), Math.floor(high / t) + 1).map(i => i * t);
}

module.exports = {
	linear: linear,
	linearTicks: linearTicks
};
