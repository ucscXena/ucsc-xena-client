var wasm = require('ucsc-xena-wasm');
var _ = require('./underscore_ext').default;
var {rgb: rgbFromHex} = require('./color_helper').default;
import {categoryMore} from './colorScales';

export var Module;

export var arrTypes = {
	'double': 'HEAPF64',
	'float': 'HEAPF32',
	'u32': 'HEAPU32',
	'u16': 'HEAPU16',
	'u8': 'HEAPU8'
};


// Take a js or typed array, and copy it to the heap as the given type.
function allocArrayAsType(type, arr) {
	var t = Module[arrTypes[type]];
	var ret = Module._malloc(arr.length * t.BYTES_PER_ELEMENT);
	t.set(arr, ret / t.BYTES_PER_ELEMENT);
	return ret;
};

// Take a typed array & copy it into the heap
export function allocArray(arr, M = Module) {
	var addr = M._malloc(arr.length * arr.BYTES_PER_ELEMENT),
	u8 = new Uint8Array(arr.buffer);
	M.HEAPU8.set(u8, addr);
	return addr;
};

var pointerSize = 4;

export function allocStrings(arr, M = Module) {
	var sorted = arr.slice().sort();
	var total = sorted.reduce((acc, s) => acc + s.length + 1, 0);
	var list = M._malloc(sorted.length * pointerSize);
	var buff = M._malloc(total);
	var offset = 0;
	sorted.forEach((s, i) => {
		var ptr = buff + offset;
		M.writeAsciiToMemory(s, ptr, false);
		M.setValue(list + i * pointerSize, ptr, '*');
		offset += s.length + 1;
	});

	return {list, buff};
}

//var allocArrayOrAsType = (arr, type) =>
//	arr.BYTES_PER_ELEMENT ? allocArray(arr) : allocArrayAsType(type, arr);

function marshalList(arrays) {
	var arrWASM = arrays.map(a => allocArray(a)), // lambda to defeat map extra params
		list = Module._malloc(arrWASM.length * pointerSize);

	arrWASM.forEach(function(a, i) {
		Module.setValue(list + i * pointerSize, a, '*');

	});
	return list;
}

function freeList(list, n) {
	var a;
	for (var i = 0; i < n; ++ i) {
		a = Module.getValue(list + i * pointerSize, '*');
		Module._free(a);
	}
	Module._free(list);
}

// XXX Note that if we return a view of memory over the indiciesW result, we
// can't free it.  We need to allocate the indicies once, then free/allocate if
// the sample count changes.  Or, we have to copy the indicies out before
// freeing. That's what slice() does.
//
// XXX important safety tip: using ALLOW_MEMORY_GROWTH means
// a malloc call can invalidate views, because it grows by
// allocating a new, larger memory space. Perhaps we could
// use a proxy object that recreates views if they become
// obsolete. Or, live with the copy overhead on each call.
// XXX See also SPLIT_MEMORY, which may resolve this problem by
// using a different growth mechanism.

export function fradixSortL16$64(input, direction, indicies) {
	var list = marshalList(input),
		indiciesW = allocArray(indicies),
		N = indicies.length,
		dirs = Module._malloc(input.length * 4); // 4 byte enums? We should probe this.

	for (var i = 0; i < input.length; ++i) {
		Module.setValue(dirs + i * 4, direction[i] === 'reverse' ? Module.enum.direction.UP : Module.enum.direction.DOWN, 'i32');
	}
	Module._fradixSortL16_64(list, dirs, input.length, N, indiciesW);

	var r = new Uint32Array(Module.HEAPU8.buffer.slice(indiciesW, indiciesW + 4 * N));
	freeList(list, input.length);
	Module._free(indiciesW);
	return r;
}

var floatSize = 4;
var getFloatIndex =
	(arr, index) => Module.getValue(arr + index * floatSize, 'float');

export function fastats(arr) {
	var arrW = allocArrayAsType('float', arr);
	var r = Module._fastats(arrW, arr.length); // modifies the input array
	var e = Module.enum.stat;
	Module._free(arrW);
	return {
		mean: getFloatIndex(r, e.MEAN),
		median: getFloatIndex(r, e.MEDIAN),
		min: getFloatIndex(r, e.MIN),
		max: getFloatIndex(r, e.MAX),
		sd: getFloatIndex(r, e.SD),
		p01: getFloatIndex(r, e.P01),
		p99: getFloatIndex(r, e.P99),
		p05: getFloatIndex(r, e.P05),
		p95: getFloatIndex(r, e.P95),
		p10: getFloatIndex(r, e.P10),
		p90: getFloatIndex(r, e.P90),
		p25: getFloatIndex(r, e.P25),
		p75: getFloatIndex(r, e.P75),
		p33: getFloatIndex(r, e.P33),
		p66: getFloatIndex(r, e.P66),
	};
}

var rgb = (r, g, b) => ((255 << 24) | ((b) << 16) | ((g) << 8) | r);

function allocScale(domain, range, m, b) {
	var struct = Module.struct.scale;
	var scale = Module._malloc(struct.size);
	Module.setValue(scale + struct.offset.count, domain.length, 'i32');
	for (let i = 0; i < domain.length; ++i) {
		Module.setValue(scale + struct.offset.domain + i * 8, domain[i], 'double');
		Module.setValue(scale + struct.offset.range + i * 4, rgb(...range[i]), 'i32');
	}
	if (m) {
		for (let i = 0; i < 3; ++i) {
			Module.setValue(scale + struct.offset.m + i * 8, m[i], 'double');
		}
	}
	if (b) {
		for (let i = 0; i < 3; ++i) {
			Module.setValue(scale + struct.offset.b + i * 8, b[i], 'double');
		}
	}
	return scale;
}

// XXX Need to abstract the operations for allocating & initializing
// arrays, because we do it a lot. Allocate + zero, or allocate + assign,
// of typed arrays.


function getArrayField(ptr, name, field, length, type) {
	var struct = Module.struct[name];
	var t = Module[arrTypes[type]];
	return new t.constructor(
		Module.HEAPU8.slice(
			ptr + struct.offset[field],
			ptr + struct.offset[field] + t.BYTES_PER_ELEMENT * length).buffer);
}

export function getArrayPtrField(ptr, name, field, length, type, M = Module) {
	var struct = M.struct[name];
	var t = M[arrTypes[type]];
	var p = M.getValue(ptr + struct.offset[field], '*');
	return new t.constructor(M.HEAPU8.slice(p, p + t.BYTES_PER_ELEMENT * length).buffer);
}

var allocOrdinal = scale =>
	// this requires a cast, because we're starting with untyped arrays
	allocArrayAsType('u32',
				[scale.length, ...scale.map(c => rgb(...rgbFromHex(c)))]);

// For testing.
export function tallyDomains(data, order, start, end, domain) {
	var b = [0, 0, 0];
	var s = allocScale(domain, [b, b, b]);
	var struct = Module.struct.summary;
	var summary = Module._malloc(struct.size);
	var d = allocArrayAsType('float', data);
	var o = allocArrayAsType('u32', order);
	Module._tally_domains(summary, s, d, o, start, end);
	var ret = {
		sum: getArrayField(summary, 'summary', 'sum', domain.length + 1, 'double'),
		count: getArrayField(summary, 'summary', 'count', domain.length + 1, 'u32')
	};
	Module._free(o);
	Module._free(d);
	Module._free(s);
	Module._free(summary);
	return ret;
}

function allocScaleLog(domain, range) {
	var [r0, r1] = range;
	var ld0 = Math.log2(domain[0] + 1);
	var ld1 = Math.log2(domain[1] + 1);
	var mb = _.mmap(r0, r1, (c0, c1) => {
		var m = (c1 - c0) / (ld1 - ld0),
			b = c1 - m * ld1;
		return {m, b};
	});
	return allocScale(domain, range, _.pluck(mb, 'm'), _.pluck(mb, 'b'));
}

// Just for testing. You wouldn't want to call this from js in a loop.
// XXX update to go through getColorScale
export function getColorLog(domain, range, value) {
	var scale = allocScaleLog(domain, range);
	var r = Module._test_scale_method(Module.enum.type.LOG, scale, value);
	Module._free(scale);

	return r;
}

// Just for testing. You wouldn't want to call this from js in a loop.
// XXX update to go through getColorScale
export function getColorLinear(domain, range, value) {
	var scale = allocScale(domain, range);
	var r = Module._test_scale_method(Module.enum.type.LINEAR, scale, value);
	Module._free(scale);
	return r;
}

export function regionColorLinearTest(domain, range, data, order, start, end) {
	var scale = allocScale(domain, range);
	var d = allocArrayAsType('float', data);
	var o = allocArrayAsType('u32', order);
	var r = Module._region_color_linear_test(scale, d, o, start, end);
	Module._free(o);
	Module._free(d);
	Module._free(scale);
	return r;
}

var linearColorScale = (domain, range) => ({
	method: Module.enum.type.LINEAR,
	scale: allocScale(domain, range.map(rgbFromHex))
});

var logColorScale = (domain, range) => ({
	method: Module.enum.type.LOG,
	scale: allocScaleLog(domain, range.map(rgbFromHex))
});

var fixme = () => console.warn("fixme");

var twoStop = (low, high, min, max) => linearColorScale([min, max], [low, high]);
var threeStop = (low, zero, high, min, max) =>
	linearColorScale([min, 0, max], [low, zero, high]);
var fourStop = (low, zero, high, min, minThresh, maxThresh, max) =>
	linearColorScale([min, minThresh, maxThresh, max], [low, zero, zero, high]);

var toLogColorScale = (low, high, min, max) => logColorScale([min, max], [low, high]);

var ordinalColorScale = (count, scale) => ({
	method: Module.enum.type.ORDINAL,
	scale: allocOrdinal(scale || categoryMore)
});

var colorScale = {
	'no-data': fixme,
	'float-pos': twoStop,
	'float-neg': twoStop,
	'float': threeStop,
	'float-thresh-pos': twoStop,
	'float-thresh-neg': twoStop,
	'float-thresh': fourStop,
	'float-thresh-log-pos': toLogColorScale,
	'float-thresh-log-neg': toLogColorScale,
	'float-log': toLogColorScale,
	'trend-amplitude': fixme,
	'ordinal': ordinalColorScale
};

export var getColorScale = ([type, ...args]) => colorScale[type](...args);

// importer for wasm code, to work around the async.

export var loaded = wasm().then(m => {
	Module = m;
	Module._fradixSort16_64_init();
	Module._fradixSort16_init();
	Module._fastats_init();
});
