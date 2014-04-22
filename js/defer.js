/*jslint nomen: true, browser: true */
/*global define: false  */

// A 0 ms defer, to replace underscore's.
// Adapted from http://dbaron.org/log/20100309-faster-timeouts
// as suggested by mozilla's MDN.

// Only add setZeroTimeout to the window object, and hide everything
// else in a closure.
define(["jquery", "lib/underscore"], function ($, _) {
	'use strict';
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
		if (event.originalEvent.source === window && event.originalEvent.data === messageName) {
			event.stopPropagation();
			if (timeouts.length > 0) {
				fn = timeouts.shift();
				a = args.shift();
				fn.apply(null, a);
			}
		}
	}

	if (window.postMessage) {
		$(window).bind("message", handleMessage);
		return setZeroTimeout;
	} else {
		return _.defer;
	}
});
