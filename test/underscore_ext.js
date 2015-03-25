/*global describe: false, it: false */
var _ = require('../js/underscore_ext');
var assert = require('assert');
var jsc = require('jsverify');

describe('underscore_ext', function () {
    describe('#maxWith', function () {
        it('should return max using cmp fn', function() {
            assert.equal(_.maxWith([5,4,3,2,1], function (x, y) { return x - y; }), 1);
            assert.equal(_.maxWith([5,4,3,2,1], function (x, y) { return y - x; }), 5);
        });
        jsc.property('sort matches sort builtin', 'array number', function (arr) {
            var cmp = function (x, y) { return y - x; };
            return arr.slice(0).sort(cmp)[0] === _.maxWith(arr, cmp);
        });
    });
});

