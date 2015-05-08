/*global describe: false, it: false, require: false */
'use strict';
var _ = require('../js/underscore_ext');
var assert = require('assert');
var jsc = require('jsverify');

describe('underscore_ext', function () {
    describe('#maxWith', function () {
        it('should return max using cmp fn', function() {
            assert.equal(_.maxWith([5, 4, 3, 2, 1], (x, y) => x - y), 1);
            assert.equal(_.maxWith([5, 4, 3, 2, 1], (x, y) => y - x), 5);
        });
        jsc.property('sort matches builtin sort', 'array number', function (arr) {
            var cmp = (x, y) => y - x;
            return arr.slice(0).sort(cmp)[0] === _.maxWith(arr, cmp);
        });
    });
});
