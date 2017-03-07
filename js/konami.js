'use strict';
var Rx = require('./rx');
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
	return Rx.Observable.fromEvent(document, 'keyup')
        .map(e => e.keyCode)                  // get the key code
        .windowCount(10, 1)               // get the last 10 keys
        .flatMap(x => x.toArray())         //
        .filter(x => _.isEqual(x, target));   // compare to known konami code sequence
};
