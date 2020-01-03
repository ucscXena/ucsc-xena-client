'use strict';

var xenaWasm = require('./xenaWasm');

// XXX note global state, from htfcStore.
function filterIndices(str, type) {
	return xenaWasm.hfcSearch(str, type);
}

export function hfc() {
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
			var length = xenaWasm.hfcLength();
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
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return obj.getOwnPropertyDescriptor(prop);
			}
			var length = xenaWasm.hfcLength();
			if (i < 0 || i >= length) {
				return undefined;
			}
			return {configurable: true, enumerable: true};
		},
		get: (obj, prop) => {
			var length = xenaWasm.hfcLength(); // XXX check performance from a loop, e.g. rendering
			if (prop === 'length') {
				return length;
			}
			if (prop === 'proxied') {
				return xenaWasm.hfcBuffer();
			}
			if (prop === Symbol.for('filterIndices')) {
				return filterIndices;
			}
			var i = parseInt(prop, 10);
			if (isNaN(i)) {
				return obj[prop];
			}
			if (i < 0 || i >= length) {
				return undefined;
			}
			return xenaWasm.hfcLookup(i);
		}
	});
}
