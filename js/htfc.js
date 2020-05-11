'use strict';

var _ = require('./underscore_ext');
var xenaWasm = require('./xenaWasm');

/*eslint-disable no-unused-vars */
// [bin dictionary]
// [bin sizes]
// [concatenated bins]

// header dict is
// [code count]:32
// group by code len
// for each group
//   len:32
//
//
// Decoding.
// basic canonical
// create table
// 	base_sym - first code # of len i
// 	base_cwd - first code of len i
// 	lj_lim - first code longer than i, right-padded to L bits
//
// 	decode_map - list of syms
//
// general (hu-tucker)
// table-driven?
// 	 make table of 2^L possible inputs, with the symbols & lengths
// 	 0001 ['a', 2]
// 	 1001 ['ba', 4], etc.
// input table looks like (code, len, sym)?
// How to build this? Either count 0-2^L & decode otherwise, recording the
// result, or compute all combinations of codes that fit in L,
// which looks like n^k, where k is the number of codes that fit.
// A generator might do nicely, here. The latter approach doesn't
// generate the in-between codes, e.g. where the lsb is the next code,
// and can be 0 or 1.
// Why would you not use a hash table? Shift bits in until a match? No
// code is a prefix of another. Length matters... how does that affect us?
// 00 is not the same as 0, but shifting 0 in will match 00. Are there
// other cases besides 0?

// tree approach.
// each node is inner, or leaf
// inner nodes need left (0) & right (1).
// leaf nodes need index to chars
// how do we count inner nodes & allocate them?
// If tree is depth n, there are at most 2^(n+1) - 1 nodes.
// So, an 8 bit code will need at most 512 entries.
// In practice, now many? And can we pre-allocate them?

function insertCode(tree, code, len, symbol) {
	var b = (1 << (len - 1)) & code;
	if (len === 1) {
		if (b) {
			tree.left = {symbol};
		} else {
			tree.right = {symbol};
		}
	} else {
		if (b) {
			tree.left = tree.left || {};
			return insertCode(tree.left, code, len - 1, symbol);
		} else {
			tree.right = tree.right || {};
			return insertCode(tree.right, code, len - 1, symbol);
		}
	}
}

// [header dictionary]
//   len32 is 1 + buff32[0] * 2 + Math.ceil(buff32[0] / 4)
function makeTree(buff32, buff8, offset8) {
	var tree = {},
		offset32 = offset8 / 4,
		len = buff32[offset32],
		codes = 1,
		symbols = 4 * (1 + 2 * len);
	for (var j = 0; j < len; ++j) {
		insertCode(tree, buff32[offset32 + codes + 2 * j],
				buff32[offset32 + codes + 2 * j + 1], buff8[offset8 + symbols + j]);
	}
	return tree;
}

function htDictLen(buff32, offset32) {
	var len = buff32[offset32];
	return 1 + 2 * len + Math.ceil(len / 4);
}

var eob = 0;
// at each step, we have input byte counter, input byte,
// input bit mask, tree position, output byte
// pointer.

function decodeI(tree, out, n, b, j = 0x80) {
	if (j > 0) {
		var nn = b & j ? n.left : n.right,
			s = nn.symbol;
		if (s != null) {
			out.push(s);
			return decodeI(tree, out, tree, b, j >> 1);
		} else {
			return decodeI(tree, out, nn, b, j >> 1);
		}
	} else {
		return n;
	}
}

function decodeRange(tree, buff8, inP, out, maxP, n = tree) {
	if (inP < maxP) {
		var b = buff8[inP];
		return decodeRange(tree, buff8, inP + 1, out, maxP, decodeI(tree, out, n, b));
	}
}

function decodeToI(tree, out, stop, n, b, j = 0x80) {
	if (j <= 0) {
		return n;
	}
	var nn = b & j ? n.left : n.right,
		s = nn.symbol;

	if (s != null) {
		out.push(s);
		return s === stop ? decodeToI(tree, out, stop, nn, b, 0) :
			decodeToI(tree, out, stop, tree, b, j >> 1);
	}
	return decodeToI(tree, out, stop, nn, b, j >> 1);
}

function decodeTo(tree, buff8, inP, out, stop, n = tree) {
	return n.symbol === stop ? inP :
		decodeTo(tree, buff8, inP + 1, out, stop,
				decodeToI(tree, out, stop, n, buff8[inP]));
}

function byteArrayOutputStream(binSize = 4096) {
	var bin = new Uint8Array(binSize),
		bins = [bin],
		count = 0;
	return {
		push: b => {
			bin[count % binSize] = b;
			count += 1;
			if (count % binSize === 0) {
				bin = new Uint8Array(binSize);
				bins.push(bin);
			}
		},
		toArray: () => {
			var out = new Uint8Array(count);
			bins.forEach((bin, i) => {
				if (i === bins.length - 1) {
					out.set(bin.slice(0, count % binSize), binSize * i);
				} else {
					out.set(bin, binSize * i);
				}
			});
			return out;
		}
	};
}

// [bin dictionary]
//  number of bits (L:int)
//  count for each bit
//  symbols
//
// len32 is 1 + L + Math.ceil(sum(counts) / 4)

// XXX We should use a faster method for huffman decoding, but doing this for now.
function makeHuffTree(buff32, buff8, offset32) {
	var L = buff32[offset32],
		code = 0,
		tree = {},
		symbols8 = 4 * (offset32 + 1 + L),
		count;
	for (var i = 0; i < L; ++i) {
		count = buff32[offset32 + 1 + i];
		for (var j = 0; j < count; ++j) {
			insertCode(tree, code++, i + 1, buff8[symbols8++]);
		}
		code <<= 1; // XXX this is probably wrong, review the coding algorithm
	}
	return tree;
}

function treeToCodes(tree, acc = [], code = '') {
	if (tree.hasOwnProperty('symbol')) {
		acc.push({code, symbol: tree.symbol});
	} else {
		treeToCodes(tree.left, acc, code + '1');
		treeToCodes(tree.right, acc, code + '0');
	}
	return acc;
}

function huffDictLen(buff32, offset32) {
	var bits = buff32[offset32],
		sum = 0;

	for (var i = 0; i < bits; ++i) {
		sum += buff32[offset32 + 1 + i];
	}
	return 1 + bits + Math.ceil(sum / 4);
}

function vbyteDecode(buff8, offset8) {
	var x = 0,
		i = offset8,
		b = buff8[i];
	while (!(b & 0x80)) {
		x = (x | b) << 7;
		b = buff8[++i];
	}
	x = x | (b & 0x7F);
	return {value: x, next: i + 1}; // XXX is it expensive to create an object like this?
}

// Would like this to be more declarative & the structures more composable,
// e.g. be able to swap huffman inner strings for re-pair.
function isoDict(data) {
	var buff8 = data,
		buff32 = new Uint32Array(buff8.buffer),
		length = buff32[0],
		binSize = buff32[1],
		binDictOffset = 2 + htDictLen(buff32, 2), // 32
		binCountOffset = binDictOffset + huffDictLen(buff32, binDictOffset), // 32
		binCount = buff32[binCountOffset],
		firstBin = binCountOffset + binCount + 1, // 32
		binDict = makeHuffTree(buff32, buff8, binDictOffset),
		tree = makeTree(buff32, buff8, 8);

	return {
		buff8,
		buff32,
		length,
		binSize,
		headerDict: tree,
		binDict,
		binDictOffset,
		binCount,
		binOffsets: binCountOffset + 1,
		firstBin
	};
}

// see this for a real solution:
function abToString(buff, count = 1, offset = 0) {
	var s = '', i = offset, c = buff[i];
	while (count--) {
		while (c !== 0) {
			s += String.fromCharCode(c);
			c = buff[++i];
		}
		c = buff[++i];
	}
	return s;
}

function dumpBinOffsets(buff32, offset, count) {
	console.log('bin offsets');
	for (var i = 0; i < count; ++i) {
		console.log(buff32[offset + i]);
	}
}

function dumpHeaders(dict) {
	var {buff8, buff32, headerDict, binOffsets, binCount, firstBin} = dict,
		out = new ArrayBuffer(100);
	for (var i = 0; i < binCount; ++i) {
		decodeTo(headerDict, buff8, 4 * firstBin + buff32[binOffsets + i], out, 0);
		console.log(abToString(out));
	}
}

function nextStr(buff, i, acc) {
	var vbyte = vbyteDecode(buff, i),
		s = abToString(buff, 1, vbyte.next),
		next = acc[acc.length - 1].slice(0, vbyte.value) + s;
	acc.push(next);
	return vbyte.next + s.length;
}

function uncompressInner(header, buff, count) {
	var acc = [header],
		p = 0;

	for (var i = 0; i < count; ++i) {
		p = nextStr(buff, p, acc);
	}
	return acc;
}

function uncompressBin(dict, i) {
	var out = byteArrayOutputStream(),
		// XXX why the 4 *, here? Need to use consistent indicies in dict.
		bin = 4 * dict.firstBin + dict.buff32[dict.binOffsets + i],
		headerP = decodeTo(dict.headerDict, dict.buff8, bin, out, 0),
		header = abToString(out.toArray()),
		rem = dict.length % dict.binSize,
		count = rem === 0 ? dict.binSize :
			i === dict.binCount - 1 ? rem :
			dict.binSize,
		upper = i === dict.binCount - 1 ? dict.buff8.length
			: 4 * dict.firstBin + dict.buff32[dict.binOffsets + 1 + i],
		out2 = byteArrayOutputStream();

	decodeRange(dict.binDict, dict.buff8, headerP, out2, upper);
	return uncompressInner(header, out2.toArray(), count - 1); // already have 1st string
}

function uncompressDict(dict) {
	var bins = _.times(dict.binCount, i => uncompressBin(dict, i));
	return bins;
}

// XXX note global state, from htfcStore.
function filterIndices(str, type) {
	return xenaWasm.htfcSearch(str, type);
}

export function htfc(data) {
	var dict = isoDict(new Uint8Array(data)),
		{binSize, length} = dict,
		cache,
		cacheId;

	xenaWasm.htfcStore(data); // XXX global state
	return new Proxy([], {
		has: (obj, prop) => {
			if (prop === 'length') {
				return true;
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return prop in obj;
			}
			if (i < 0 || i >= length) {
				return false;
			}
			return true;
		},
		getOwnPropertyDescriptor(obj, prop) {
			if (prop === 'length') {
				return {configurable: false, enumerable: false, writable: true};
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return obj.getOwnPropertyDescriptor(prop);
			}
			if (i < 0 || i >= length) {
				return undefined;
			}
			return {configurable: true, enumerable: true};
		},
		get: (obj, prop) => {
			if (prop === 'length') {
				return length;
			}
			if (prop === 'proxied') {
				return data;
			}
			if (prop === 'filterIndices') {
				return filterIndices;
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return obj[prop];
			}
			if (i < 0 || i >= length) {
				return undefined;
			}
			var bin = ~~(i / binSize);
			if (cacheId !== bin) {
				cacheId = bin;
				cache = uncompressBin(dict, cacheId);
			}
			return cache[i % binSize];
		}
	});
}

//var c = treeToCodes(dict.binDict);
//var out = new ArrayBuffer(2000); // 2000?
//var headerP = decode(dict.headerDict, dict.buff8, 4 * dict.firstBin, out).inP;
//var prefix = abToString(out);
//console.log('header done');
//decode(dict.binDict, dict.buff8, headerP + 1, out, 4 * dict.firstBin + dict.buff32[dict.binOffsets + 1]);
//console.log('bin done');
//var vbyte = vbyteDecode(out, 0);
//console.log('vbyte done');
//var s = abToString(out, 1, vbyte.next);
//console.log('prefix', prefix, 'len', vbyte.value, 'string', s);
//var str = prefix.slice(0, vbyte.value) + s;
//console.log([prefix, str]);

//var i = vbyte.next + s.length;
//vbyte = vbyteDecode(out, i);
//s = abToString(out, 1, vbyte.next);
//console.log(str.slice(0, vbyte.value) + s);

//var fs = require('fs');
//var file = process.argv[2] || [process.env.HOME, 'ucsc-xena-server', 'singlecell.bin'].join('/');
//
//var data = fs.readFileSync(file); // UInt8Array. data.buffer is ArrayBuffer
//
//var dict = isoDict(data);
//
//console.profile('decompress');
//var all = uncompressDict(dict);
//console.profileEnd('decompress');
////console.log(all.length);
