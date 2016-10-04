/*global browser: false */
'use strict';
//var _ = require('underscore');

var timeout = 6000;

function clickWhenEnabled(sel) {
	browser.element(sel).waitForEnabled(timeout);
	browser.element(sel).click();
}

function clickWhenVisible(sel) {
	browser.element(sel).waitForVisible(timeout);
	browser.element(sel).click();
}

//function waitUntilStill(sel) {
//	var pos = browser.element(sel).getLocation();
//	browser.waitUntil(function () {
//		var newPos = browser.element(sel).getLocation();
//		if (_.isEqual(newPos, pos)) {
//			return true;
//		}
//		pos = newPos;
//		return false;
//	}, timeout, 'Element still moving after ${timeout}ms', 100);
//}

module.exports = {
	clickWhenVisible,
	clickWhenEnabled
};
