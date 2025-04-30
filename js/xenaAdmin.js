/*global define: false */
import Rx from './rx';
var {encodeObject} = require('./util').default;
import { isArray, merge } from './underscore_ext.js';

function update(host, files, flags) {
	files = isArray(files) ? files : [files];
	return {
		headers: {'Content-Type': 'application/x-www-form-urlencoded'},
		url: host + '/update/',
		body: encodeObject(merge({file: files}, flags)),
		method: 'POST',
		crossDomain: true
	};
}

const load = function (host, files, always) {
    return Rx.Observable.ajax(update(host, files, always ? {always: true} : {}));
};

const deleteDataset = function (host, files) {
    return Rx.Observable.ajax(update(host, files, {delete: true}));
};

export { load, deleteDataset };
