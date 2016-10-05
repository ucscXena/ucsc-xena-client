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
	var pos = browser.getLocation(sel);
	browser.waitUntil(function () {
		var newPos = browser.getLocation(sel);
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

module.exports = {
	waitUntilStill,
	clickWhenVisible,
	clickWhenEnabled,
	clickWhenStill
};
