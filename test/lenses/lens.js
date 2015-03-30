/*global describe: false, it: false, require: false */
"use strict";
var lens = require('../../js/lenses/lens');
var _ = require('../../js/underscore_ext');
var assert = require('assert');
describe('lenses/lens', function () {
    describe('#lens', function () {
        it('should get', function() {
            var fooLens = lens.lens(x => x.foo, (x, foo) => _.assoc(x, 'foo', foo));

            assert.deepEqual(lens.view(fooLens, {foo: 5, bar: 7}), 5);
            assert.deepEqual(lens.view(fooLens, {foo: ['hello'], bar: 7}), ['hello']);
        });
        it('should set', function() {
            var fooLens = lens.lens(x => x.foo, (x, foo) => _.assoc(x, 'foo', foo));

            assert.deepEqual(lens.set(fooLens, {foo: 5, bar: 7}, ['hello']), {foo: ['hello'], bar: 7});
            assert.deepEqual(lens.set(fooLens, {foo: ['hello'], bar: 7}, 12), {foo: 12, bar: 7});
        });
        it('should compose with other lenses', function() {
            var fooLens = lens.lens(x => x.foo, (x, foo) => _.assoc(x, 'foo', foo)),
                thirdLens = lens.lens(x => x[2], (x, third) => _.assoc(x, 2, third)),
                thirdFooLens = _.compose(thirdLens, fooLens);

            assert.deepEqual(lens.view(thirdFooLens, [{foo: 12}, {foo: 2}, {foo: 'bingo'}]), 'bingo');
            assert.deepEqual(lens.set(thirdFooLens, [{foo: 12}, {foo: 2}, {foo: 'bingo'}], 'hork'), [{foo: 12}, {foo: 2}, {foo: 'hork'}]);
        });
        it('should work with closed-over getter/setter', function() {
            var state = {some: "state"},
                mutLens = lens.lens(() => state, (x, s) => state = s);

            assert.deepEqual(lens.view(mutLens, {foo: 5, bar: 7}), {some: "state"});
            assert.deepEqual(lens.set(mutLens, {foo: 5, bar: 7}, {different: "state"}), {different: "state"});
            assert.deepEqual(state, {different: "state"});
        });
        // 'should only call setter once'
        it('should compose with closed-over getter/setter', function() {
            var state = {foo: "state"},
                mutLens = lens.lens(() => state, (x, s) => state = s),
                fooLens = lens.lens(x => x.foo, (x, foo) => _.assoc(x, 'foo', foo)),
                mutFooLens = inj => mutLens(fooLens(inj));

            assert.deepEqual(lens.view(mutFooLens), "state");
            assert.deepEqual(state, {foo: "state"});
            assert.deepEqual(lens.set(mutFooLens, undefined, "hork"), {foo: "hork"});
            assert.deepEqual(state, {foo: "hork"}); // XXX put in separate test?
        });
        it('should compose twice with closed-over getter/setter', function() {
            var state = [{foo: "one"}, {foo: "two"}, {foo: "three"}],
                mutLens = lens.lens(() => state, (x, s) => state = s),
                fooLens = lens.lens(x => x.foo, (x, foo) => _.assoc(x, 'foo', foo)),
                thirdLens = lens.lens(x => x[2], (x, third) => _.assoc(x, 2, third)),
                mutThirdFooLens = inj => mutLens(thirdLens(fooLens(inj)));

            assert.deepEqual(lens.view(mutThirdFooLens), "three");
            assert.deepEqual(state, [{foo: "one"}, {foo: "two"}, {foo: "three"}]);
            assert.deepEqual(lens.set(mutThirdFooLens, undefined, "hork"), [{foo: "one"}, {foo: "two"}, {foo: "hork"}]);
            assert.deepEqual(state, [{foo: "one"}, {foo: "two"}, {foo: "hork"}]);
        });
    });
});
