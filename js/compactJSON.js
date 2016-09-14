// Compact encoding for structures with multiple references to the same
// objects, e.g. the type of structures we get by doing a naive path copy in
// ./immutable.js.
//
// Such structures waste a lot of space when JSON stringified, because each
// reference is stringified independently. The routines here will instead
// insert a JSON pointer if the reference has already been stringified. When
// parsing, we resolve any pointers.
//
// One drawback of this technique is it prevents using JSON pointers in our
// structures. If this becomes a requirement, we could use a private encoding
// for pointers, e.g. `##ref#${path.join('/')}`, or etc.
//
// To identify references which have already been stringified, we use an es6
// Map, which gives us O(1) performance, but uses reference semantics. Note
// this means two equal objects will be stringified independently if they are
// not the same reference object. If value semantics are required we would need
// to do a linear search with _.isEqual, or use a hashing method, or use better
// underlying data structures (i.e. not plain js).

'use strict';
var _ = require('./underscore_ext');


var isRef = x => _.has(x, '$ref');
var type = x => isRef(x) ? 'ref' : (_.isUndefined(x) ? 'undefined' : (_.isArray(x) ? 'array' : (_.isObject(x) ? 'object' : 'primitive')));
var m = (x, methods) => methods[type(x)](x);

// escape slash so we can join/split on it.
var escSlash = s => s.toString().replace(/\//g, '~1');
var unescSlash = s => s.toString().replace(/~1/g, '/');

var escQuote = s => s.toString().replace(/"/g, '\\"');

// for objects: filter props that shouldn't be JSON encoded.
var validKeys = x => _.pick(x, v => !_.isUndefined(v) && !_.isFunction(v));
var mapPairs = (x, fn) => _.pairs(x).map(fn);
var kvStr = (k, v) => `"${escQuote(k)}":${v}`;

function stringify(x) {
	var cache = new Map();

	// make fn that caches references to objects
	let addToCache = (path, fn) => x => {
		cache.set(x, JSON.stringify({'$ref': `#/${path.map(escSlash).join('/')}`}));
		return fn(x);
	};

	let stringifyCached = (y, path) =>
		cache.has(y) ?
		cache.get(y) :
		m(y, {
			ref: () => {throw new Error('Can\'t stringify JSON pointers');},
			array: addToCache(path, x => `[${x.map((v, i) => stringifyCached(v, [...path, i])).join(',')}]`),
			object: addToCache(path, x => `{${mapPairs(validKeys(x), ([k, v]) => kvStr(k, stringifyCached(v, [...path, k]))).join(',')}}`),
			primitive: x => JSON.stringify(x),
			'undefined': () => 'null'
		});

	return stringifyCached(x, []);
}

var refToPath = s => s.$ref.slice(2).split('/').map(unescSlash);
var getRefIn = (x, ref) => _.getIn(x, refToPath(ref));

// After running fn on coll, if the values in the result are identical to the
// values in the input, return the input (to preserve reference equality).
var preserveId = fn => coll => {
	var calc = fn(coll);
	for (var i in calc) {
		if (calc[i] !== coll[i]) {
			return calc;
		}
	}
	return coll;
};

function parse(x) {
	var refd = JSON.parse(x),
		cache = new Map();

	var findRef = ref => {
		if (!cache.has(ref.$ref)) {
			cache.set(ref.$ref, resolve(getRefIn(refd, ref))); //eslint-disable-line no-use-before-define
		}
		return cache.get(ref.$ref);
	};

	let resolve = y =>
		m(y, {
			ref: findRef,
			array: preserveId(x => x.map(resolve)),
			object: preserveId(x => _.mapObject(x, resolve)),
			primitive: x => x
		});

	return resolve(refd);
}

module.exports = {stringify, parse};
