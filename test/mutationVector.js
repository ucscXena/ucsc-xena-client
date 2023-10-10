/*global describe: false, it: false, require: false */
var mv = require('../js/model/mutationVector');
var assert = require('assert');
describe('mutationVector', function () {
    describe('#rowOrder', function () {
        it('should sort high impact first', function() {
            assert(0 < mv.rowOrder(
                    [{effect: 'RNA', gene: 'A', start: 10}],
                    [{effect: 'stop_gained', gene: 'A', start: 10}],
                    {'A': {txStart: 10, strand: '+'}}));
            assert(0 > mv.rowOrder(
                    [{effect: 'stop_gained', gene: 'A', start: 10}],
                    [{effect: 'RNA', gene: 'A', start: 10}],
                    {'A': {txStart: 10, strand: '+'}}));
        });
    });
});
