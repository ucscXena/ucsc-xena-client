var _ = require('../underscore_ext').default;

export var setBit = (bitmap, i) => bitmap[~~(i / 8)] |= 1 << i % 8;
export var isSet = (bitmap, i) => bitmap[~~(i / 8)] & (1 << i % 8);
export var listToBitmap = (n, arr) => {
	var res = new Uint8Array(Math.ceil(n / 8));
	arr.forEach(v => setBit(res, v));
	return res;
};

export function mapToBitmap(arr, pred) {
	var res = listToBitmap(arr.length, []);
	arr.forEach((v, i) => pred(v, i) && setBit(res, i));
	return res;
}

var bits = _.range(8);
export var fromBitmap = bitmap => {
	var result = [];
	bitmap.forEach((v, i) =>
		bits.forEach(b => (v & (1 << b)) && result.push(i * 8 + b)));
	return result;
};

export function union(first, ...rest) {
	var result = Uint8Array.from(first);
	rest.forEach(barr => barr.forEach((v, i) => result[i] |= v));
	return result;
}

export function intersection(first, ...rest) {
	var result = Uint8Array.from(first);
	rest.forEach(barr => barr.forEach((v, i) => result[i] &= v));
	return result;
}

var wrap = r => 8 - (8 - r) % 8; // wrap 0 to 8

export function invert(n, bitmap) {
	var result = bitmap.map(v => ~v & 0xFF);
	// zero the high bits past n.
	result[result.length - 1] ^= (0xFF << wrap(n % 8)) & 0xFF;
	return result;
}

// count bits in each byte value [0...255]
var bitCounts = _.Let((r = [0]) => {
	for (var i = 0; i < 256; ++i) {
		r[i] = (i & 1) + r[~~(i / 2)];
	}
	return r;
});

export var bitCount = bitmap => bitmap.reduce((acc, b) => acc + bitCounts[b], 0);

// Cut rows from bitmap a where bitmap b is zero. Requires the lengths
// of the inputs, and the output.
export function removeRows(a, b, n, nc) {
	var c = listToBitmap(nc, []);

	for (var i = 0, j = 0; i < n; ++i) {
		if (isSet(b, i)) {
			if (isSet(a, i)) {
				setBit(c, j);
			}
			++j;
		}
	}
	return c;
}
