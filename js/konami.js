'use strict';
var Rx = require('rx');
require('rx.aggregates');
require('rx-dom');
var _ = require('./underscore_ext');

var codes = [
	38, // up
	38, // up
	40, // down
	40, // down
	37, // left
	39, // right
	37, // left
	39, // right
	66  // b
];


module.exports = last => {
	var target = [...codes, last];
	return Rx.DOM.keyup(document)
        .map(e => e.keyCode)                  // get the key code
        .windowWithCount(10, 1)               // get the last 10 keys
        .selectMany(x => x.toArray())         //
        .filter(x => _.isEqual(x, target));   // compare to known konami code sequence
};
