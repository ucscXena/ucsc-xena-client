/*global define: false */
'use strict';
var Rx = require('./rx');
var {encodeObject} = require('./util');
var {isArray, merge} = require('./underscore_ext');

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

module.exports = {
	load: function (host, files, always) {
		return Rx.Observable.ajax(update(host, files, always ? {always: true} : {}));
	},
	delete: function (host, files) {
		return Rx.Observable.ajax(update(host, files, {delete: true}));
	}
};
