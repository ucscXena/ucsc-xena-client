var wasm = require('ucsc-xena-wasm');
var Rx = require('./rx').default;
import {allocArray, allocStrings, getArrayPtrField} from './xenaWasm';

function hfcSet(Module, data) {
	// The wasm call will hold this until it is called again, at which point
	// the previous buffer is freed. It might be better to free the data before
	// passing in more. We could, in fact, do this by passing in NULL.
	var buff = allocArray(data, Module);
	Module._hfc_set(buff, data.length);
}

function hfcSetEmpty(Module) {
	// see note in hfcSet
	Module._hfc_set_empty();
}

function hfcBuffer(Module) {
	var buff = Module._hfc_buff();
	var len = Module._hfc_buff_length();
	return new Uint8Array(Module.HEAPU8.buffer.slice(buff, buff + len));
}

function hfcDup(ModuleIn) {
	return Rx.Observable.bindCallback(wasm().then)().map(Module => {
		hfcSet(Module, hfcBuffer(ModuleIn));
		return Module;
	});
}

function hfcLength(Module) {
	return Module._hfc_length();
}

// XXX How does this affect memory usage? Does it grow to the
// size of the uncompressed data?
function hfcMerge(Module, data) {
	if (hfcLength(Module) === 0) {
		// avoid merge of one
		hfcSet(Module, data);
	} else {
		var buff = allocArray(data, Module);
		Module._hfc_merge(buff, data.length);
	}
}

function hfcLookup(Module, i) {
	// does this need to dup the string?
	return Module.UTF8ToString(Module._hfc_lookup(i));
}

// XXX note global state, from htfcStore.
var hfcStore = Module => (str, type) => {
	var searchType = Module.enum.search_type;
	var s = allocArray(new Uint8Array(Array.prototype.map.call(str, x => x.charCodeAt(0)).concat([0])), Module);

	var r = Module._hfc_search(s, searchType[type]);
	var len = Module.getValue(r + Module.struct.search_result.offset.count, 'i32');
	var matches = getArrayPtrField(r, 'search_result', 'matches', len, 'u32', Module);

	Module._free(s);
	return matches;
};

var hfcFilter;

function hfcProxy(Module, hasPrivateSamples) {
	var filterIndices = hfcStore(Module);
	return new Proxy([], {
		has: (obj, prop) => {
			if (prop === 'length') {
				return true;
			}
			if (prop === 'proxied') {
				return true;
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return prop in obj;
			}
			var length = hfcLength(Module);
			if (i < 0 || i >= length) {
				return false;
			}
			return true;
		},
		getOwnPropertyDescriptor(obj, prop) {
			if (prop === 'length') {
				return {configurable: false, enumerable: false, writable: true};
			}
			if (prop === 'proxied') {
				return {configurable: false, enumerable: false, writable: false};
			}
			if (prop === 'filter') {
				return {configurable: false, enumerable: false, writable: false};
			}
			if (prop === 'hasPrivateSamples') {
				return {configurable: false, enumerable: false, writable: false};
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return Object.getOwnPropertyDescriptor(obj, prop);
			}
			var length = hfcLength(Module);
			if (i < 0 || i >= length) {
				return undefined;
			}
			return {configurable: true, enumerable: true};
		},
		get: (obj, prop) => {
			var length = hfcLength(Module); // XXX check performance from a loop, e.g. rendering
			if (prop === 'length') {
				return length;
			}
			if (prop === 'proxied') {
				return hfcBuffer(Module);
			}
			if (prop === 'filter') {
				return samples => hfcFilter(Module, samples, hasPrivateSamples);
			}
			if (prop === 'hasPrivateSamples') {
				return hasPrivateSamples;
			}
			if (prop === 'filterIndices') {
				return filterIndices;
			}
			if (typeof prop === 'symbol') {
				return undefined;
			}

			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return obj[prop];
			}
			if (i < 0 || i >= length) {
				return undefined;
			}
			return hfcLookup(Module, i);
		}
	});
}

// Since we can't recover wasm memory after it expands, the only way
// to recover memory is create a smaller wasm & GC the old one. Here
// we duplicate a wasm, then perform a filter operation. The filter
// will expand all of the selected strings, then compress them. The
// space used for expansion is recovered by duplicating the wasm.
hfcFilter = function(ModuleIn, list, hasPrivateSamples) {
	return hfcDup(ModuleIn).map(Module => {
		var s = allocArray(new Uint32Array(list), Module);
		Module._hfc_filter(s, list.length);
		Module._free(s);
		return Module;
	}).mergeMap(Module => hfcDup(Module)) // 2nd dup, to free memory
		.map(Module => hfcProxy(Module, hasPrivateSamples));
};

export function hfcCompress(Module, strings) {
	var {list, buff} = allocStrings(strings, Module);
	var hfc = Module._hfc_compress(strings.length, list);
	Module._free(buff);
	Module._free(list);
	var struct = Module.struct.bytes;
	var bytes = {
		buff: Module.getValue(hfc + struct.offset.bytes, '*'),
		length: Module.getValue(hfc + struct.offset.len, 'i32')
	};
	var ret = new Uint8Array(Module.HEAP8.buffer.slice(bytes.buff, bytes.buff + bytes.length));
	Module._free(bytes.buff);
	Module._free(hfc);
	return ret;
}

export function hfcSync(Module, samples, hasPrivateSamples) {
	hfcSet(Module, samples);
	return hfcProxy(Module, hasPrivateSamples);
}

export function hfc(pub, priv) {
	return Rx.Observable.bindCallback(wasm().then)().map(
		Module => {
			hfcSetEmpty(Module);
			pub.forEach(([samples]) => {
				hfcMerge(Module, samples);
			});
			var pubLength = hfcLength(Module);
			priv.forEach(([samples]) => {
				hfcMerge(Module, samples);
			});
			return hfcProxy(Module, hfcLength(Module) > pubLength);
		});
}
