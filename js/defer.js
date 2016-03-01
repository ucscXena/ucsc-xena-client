/*eslint-env browser */
/*global require: false, module: false  */

// A 0 ms defer, to replace underscore's.
// Adapted from http://dbaron.org/log/20100309-faster-timeouts
// as suggested by mozilla's MDN.

'use strict';
var _ = require('underscore');
var timeouts = [],
	args = [],
	messageName = "zero-timeout-message",
	slice = Array.prototype.slice;

// Like setTimeout, but only takes a function argument.  There's
// no time argument (always zero).
function setZeroTimeout(fn) {
	timeouts.push(fn);
	args.push(slice.call(arguments, 1));
	window.postMessage(messageName, "*");
}

function handleMessage(event) {
	var fn, a;
	if (event.source === window && event.data === messageName) {
		event.stopPropagation();
		if (timeouts.length > 0) {
			fn = timeouts.shift();
			a = args.shift();
			fn.apply(null, a);
		}
	}
}

if (window.postMessage) {
	window.addEventListener("message", handleMessage, false);
}

module.exports = window.postMessage ? setZeroTimeout : _.defer;
