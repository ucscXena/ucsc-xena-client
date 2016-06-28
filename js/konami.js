/*global require: false, module: false */
/*eslint-env browser */
'use strict';
var Rx = require('rx');
var Rx = require('rx.aggregates');
require('rx-dom');

var codes = [
        38, // up
        38, // up
        40, // down
        40, // down
        37, // left
        39, // right
        37, // left
        39, // right
        66, // b
        65  // a
    ];

var konami = Rx.Observable.fromArray(codes);

module.exports = Rx.DOM.keyup(document)
        .map(e => e.keyCode)                      // get the key code
        .windowWithCount(10, 1)                   // get the last 10 keys
        .selectMany(x => x.sequenceEqual(konami)) // compare to known konami code sequence
        .filter(x => x);                          // where we match
