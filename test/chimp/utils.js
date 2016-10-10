/*global browser: false */
'use strict';
var _ = require('underscore');

var timeout = 6000;

function clickWhenEnabled(sel) {
	browser.element(sel).waitForEnabled(timeout);
	browser.element(sel).click();
}

function clickWhenVisible(sel) {
	browser.element(sel).waitForVisible(timeout);
	browser.element(sel).click();
}

// Wait for visible, and location has stopped changing.
// Combining these is a hack for use when elements
// are added to the page with an animation.
function waitUntilStill(sel) {
	browser.element(sel).waitForVisible(timeout);

	// XXX Both params to getLocation are required, to avoid a wdio bug: it uses
	// the arity of functions to decide whether to prepend an implicit selector to
	// the args. A getLocation() call with only a selector will lead to a later failure
	// in browser.elements(), when a null selector is prepended to the args.
	var pos = browser.getLocation(sel, 'both');
	browser.waitUntil(function () {
		var newPos = browser.getLocation(sel, 'both'); // XXX as above
		if (_.isEqual(newPos, pos)) {
			return true;
		}
		pos = newPos;
		return false;
	}, timeout, 'Element still moving after ${timeout}ms', 100);
}

function clickWhenStill(sel) {
	waitUntilStill(sel);
	browser.click(sel);
}

function complain(x) {
	console.log('working around broken saveScreenshot');
	return x;
}

// wdio-sync has a bug that calls Object.create on the Buffer returned
// by saveScreenshot.
function saveScreenshot(...args) {
	var b = browser.saveScreenshot(...args);
	return Buffer.isBuffer(b.__proto__) ? complain(b.__proto__) : b;
}

module.exports = {
	waitUntilStill,
	clickWhenVisible,
	clickWhenEnabled,
	clickWhenStill,
	saveScreenshot
};
