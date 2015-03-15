/*jslint browser: true, nomen: true */
/*global define: false */

define(['jquery', 'underscore'], function ($, _) {
	'use strict';

	var reduce = _.reduce,
		map = _.map,
		groupBy = _.groupBy,
		sortBy = _.sortBy,
		last = _.last,
		uniq = _.uniq,
		pluck = _.pluck,
		filter = _.filter;

	function pluck_tte(x) {
		return pluck(x, 'tte');
	}

	// kaplan-meier
	// See http://en.wikipedia.org/wiki/Kaplan%E2%80%93Meier_estimator
	//
	// tte  time to exit (event or censor)
	// ev   is truthy if there is an event.
	function compute(tte, ev) {
		var exits = sortBy(map(tte, function (x, i) { return { tte: x, ev: ev[i] }; }), 'tte'), // sort and collate
			uexits = uniq(pluck_tte(exits), true),                    // unique tte
			gexits = groupBy(exits, function (x) { return x.tte; }),  // group by common time of exit
			dini = reduce(uexits, function (a, tte) {                 // compute d_i, n_i for times t_i (including censor times)
				var group = gexits[tte],
					l = last(a) || {n: exits.length, e: 0},
					events = filter(group, function (x) { return x.ev; });

				a.push({
					n: l.n - l.e,     // at risk
					e: group.length,  // number exiting
					d: events.length, // number events (death)
					t: group[0].tte   // time
				});
				return a;
			}, []),

			si = reduce(dini, function (a, dn) { // survival at each t_i (including censor times)
				var l = last(a) || { s: 1 };
				if (dn.d) {                      // there were events at this t_i
					a.push({t: dn.t, e: true, s: l.s * (1 - dn.d / dn.n)});
				} else {                          // only censors
					a.push({t: dn.t, e: false, s: l.s});
				}
				return a;
			}, []);

		return si;
	}

	return {
		compute: compute
	};
});
