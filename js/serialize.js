import * as arrays from './arrays.js';
var wasm = require('ucsc-xena-wasm');
import {hfcSync} from './hfc';

import { Let, times } from './underscore_ext.js';
import Rx from './rx';
var {Observable: {bindCallback, zipArray}} = Rx;

var type = '__type';

var fromTyped = arr => arrays.ab2str(arr.buffer);
var toF32 = str => new Float32Array(arrays.str2ab(str));
var toU32 = str => new Uint32Array(arrays.str2ab(str));
var toU16 = str => new Uint16Array(arrays.str2ab(str));

// Uint8 requires special handling due to ab2str needing an even
// byte count.

var even = arr => arr.length % 2 === 0 ? arr :
	new Uint8Array(arr.length + 1).set(arr, 0);

var fromU8 = arr => ({length: arr.length, str: arrays.ab2str(even(arr).buffer)});
var toU8 = ({length, str}) => new Uint8Array(arrays.str2ab(str)).slice(0, length);

var replacer = (key, x) =>
	x === undefined ? {[type]: 'undefined'} :
	x !== x ? {[type]: 'NaN'} :
	x && x.proxied ? {[type]: 'hfc', data: x.proxied, 'private': x.hasPrivateSamples} :
	x instanceof Float32Array ? {[type]: 'Float32Array', data: fromTyped(x)} :
	x instanceof Uint32Array ? {[type]: 'Uint32Array', data: fromTyped(x)} :
	x instanceof Uint16Array ? {[type]: 'Uint16Array', data: fromTyped(x)} :
	x instanceof Uint8Array ? ({[type]: 'Uint8Array', data: fromU8(x)}) :
	x;

// We can't instantiate hfc because they're async, or undefined because
// JSON.parse doesn't allow it. So, track them here & fix up after parse.
var getReviver = (hfcs, undefs) =>
	function reviver(key, x) {
		return !(x && x[type]) ? x :
			x[type] === 'undefined' ? (undefs.push([this, key]), x) :
			x[type] === 'hfc' ? (hfcs.push([this, key]), x) :
			x[type] === 'NaN' ? NaN :
			x[type] === 'Float32Array' ? toF32(x.data) :
			x[type] === 'Uint32Array' ? toU32(x.data) :
			x[type] === 'Uint16Array' ? toU16(x.data) :
			x[type] === 'Uint8Array' ? toU8(x.data) :
			x;
	};

export var serialize = x => JSON.stringify(x, replacer);

export var deserialize = data =>
	Let((hfcs = [], undefs = [],
		 state = JSON.parse(data, getReviver(hfcs, undefs)),
		 wasms = times(hfcs.length, () => bindCallback(wasm().then)())) =>
		zipArray(wasms).map(modules => {
			modules.forEach((module, i) => {
				var [obj, key] = hfcs[i];
				obj[key] = hfcSync(module, obj[key].data, obj[key].private);
			});
			undefs.forEach(([obj, key]) => obj[key] = undefined);
			return state;
		}));
