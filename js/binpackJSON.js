import _ from './underscore_ext';

// binpack json encodes as json, but puts binary objects verbatum into a
// preceding buffer. Back references in the json point to the binary
// objects.
//
// XXX Should be using a DataView to control byte order. Currently
// works on little-endian platforms.

function writeInt(buff, offset, i) {
	buff[offset] = 0xff & i;
	buff[offset + 1] = 0xff & (i >> 8);
	buff[offset + 2] = 0xff & (i >> 16);
	buff[offset + 3] = 0xff & (i >> 24);
}

export function writeBin(buff, bin, offset) {
	writeInt(buff, offset, bin.length);
	buff.set(bin, offset + 4);
}

// XXX this is wrong for unicode
export function writeStr(buff, str, offset) {
	var len = str.length;
	for (var x = 0; x < len; ++x) {
		buff[offset + x] = str.charCodeAt(x);
	}
}

// XXX this is wrong for unicode
function readStr(buff) {
	var len = buff.length,
		str = '';
	for (var i = 0; buff[i] !== 0 && i < len; ++i) {
		str += String.fromCharCode(buff[i]);
	}
	return str;
}

// To encode a data structure with binary objects, we use the built-in
// JSON stringify method, after attaching a custom toJSON method
// to the binary objects. The toJSON method is side-effecting,
// because it must build output buffers while emitting the
// back references.
//
// An alternative approach would be to tree-walk, replacing blobs with
// references, and to then call JSON.stringify. A down-side is that we end up
// walking all of the data arrays.
//
// There's an additional problem TDB re: how to serialize these data
// structures for localstorage.

var bins = []; // XXX global state! Captures binary blobs during JSON.stringify.

// toJSON method for binary blobs.
export function toJSON() {
	var i = bins.length;
	bins.push(this);
	return {$type: "ref", value: {"$bin": i}};
}

var align  = x => Math.ceil(x / 4) * 4;

export function concatBins(bins, expr) {
	var lens = bins.map(b => Math.ceil(b.length / 4) * 4 + 4),
		txtLen = align(expr.length + 1),
		offsets = _.scan(lens, (acc, x) => acc + x, txtLen),
		// XXX expr.length here is wrong for unicode
		len = _.sum(bins.map(b => align(b.length) + 4)) + txtLen,
		buff = new Uint8Array(len);

	// Note that align(), above, ensures that the string is null-terminated,
	// because typed arrays are initialized to zero. I.e. we skip the zero, we
	// don't write it.
	writeStr(buff, expr, 0);
	bins.forEach((bin, i) => writeBin(buff, bin, offsets[i]));

	return buff;
}

export function stringify(obj) {
	bins = [];
	var json = JSON.stringify(obj);
	return concatBins(bins, json);
}

var hop = Object.prototype.hasOwnProperty;

export var setToJSON = x => (x.toJSON = toJSON, x);

export function parse(buff) {
	var out = [],
		buff32 = new Uint32Array(buff.buffer),
		len = buff.length,
		txtLen = align(buff.indexOf(0) + 1),
		inP = txtLen,
		binLen;
	while (inP < len) {
		binLen = buff32[inP >> 2];
		out.push(buff.slice(inP + 4, inP + 4 + binLen));
		inP += 4 + align(binLen);
	}
	return JSON.parse(readStr(buff), (k, v) =>
			v == null ? v :
			hop.call(v, '$type') && v.$type === 'ref' ? setToJSON(out[v.value.$bin]) :
			v);
}
