/*global describe: false, it: false, require: false */
'use strict';
var assert = require('assert');
var jsc = require('jsverify');
var scale = require('../js/scale');
var _ = require('underscore');


//var extent = jsc.suchthat(jsc.pair(jsc.number(), jsc.number()), (a, b) => a !== b);
var extent = jsc.pair(jsc.number(), jsc.number());

describe('scale', function () {
    describe('#linear', function () {
        jsc.property('returns values in range', extent, extent, 'number', function ([dstart, dend], [rstart, rend], input) {
			if (rend === rstart || dend === dstart) {
				return true; // report these positive until getting suchthat working.
			}
			var s = scale.linear([dstart, dend], [rstart, rend]),
				output = s(input);
			// Using assert so we can report the failure condition.
			assert((rend > rstart && rstart <= output && rend >= output) ||
				(rstart > rend && rstart >= output && rend <= output),
				`Output ${output} not in range [${rstart} ${rend}] with domain [${dstart}, ${dend}] and input ${input}`); //eslint-disable-line comma-spacing
			return true;
        });
        jsc.property('is monotonic', extent, extent, extent, function ([dstart, dend], [rstart, rend], [pt0, pt1]) {
			if (rend === rstart || dend === dstart) {
				return true; // report these positive until getting suchthat working.
			}
			var sign = (rend > rstart ? 1 : -1) * (dend > dstart ? 1 : -1) *
					(pt1 > pt0 ? 1 : -1),
				s = scale.linear([dstart, dend], [rstart, rend]),
				out0 = s(pt0),
				out1 = s(pt1);
			// Using assert so we can report the failure condition.
			assert((sign === 1 && out1 >= out0) ||
				(sign === -1 && out0 >= out1),
				`Output moves in wrong direction`); //eslint-disable-line comma-spacing
			return true;
        });
    });
    describe('#linearTicks', function () {
        jsc.property('between 4 and 9 ticks', extent, function ([dstart, dend]) {
			if (dend === dstart) {
				return true; // report these positive until getting suchthat working.
			}
			var ticks = scale.linearTicks(dstart, dend);
			assert(ticks.length >=4 && ticks.length <= 9,
				`Tick count outside of range. ${ticks}`);
			return true;
        });
        jsc.property('ticks are in domain', extent, function ([dstart, dend]) {
			if (dend === dstart) {
				return true; // report these positive until getting suchthat working.
			}
			var [low, high] = dend > dstart ? [dstart, dend] : [dend, dstart];
			var ticks = scale.linearTicks(dstart, dend);
			assert(_.every(ticks, t => t > low && t < high),
				`Tick outside of domain. ${ticks}`);
			return true;
        });
	});
});
