/*global require: false, it: false, console: false, describe: false, mocha: false */
import {setToJSON, stringify, parse} from '../js/binpackJSON';
//import _ from '../js/underscore_ext';
var assert = require('assert');


describe('binpackJSON', function () {
	describe('serialize', function () {
		it('deepEquals arrays', function () {
			assert.deepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]));
			assert.notDeepEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]));
		});
		it('serializes object with blob', function () {
			var x = {foo: setToJSON(new Uint8Array([1, 2, 3]))};
			var bpjson = stringify(x);
			var orig = parse(bpjson);
			assert(bpjson.length > 0);
			assert.deepEqual(x, orig);
		});
		it('serializes array with blob', function () {
			var x = ["foo", setToJSON(new Uint8Array([1, 2, 3]))];
			var bpjson = stringify(x);
			var orig = parse(bpjson);
			assert(bpjson.length > 0);
			assert.deepEqual(x, orig);
		});
		it('serializes top-level blob', function () {
			var x = setToJSON(new Uint8Array([1, 2, 3]));
			var bpjson = stringify(x);
			var orig = parse(bpjson);
			assert(bpjson.length > 0);
			assert.deepEqual(x, orig);
		});
	});
});
