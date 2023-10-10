/*global define: false */
var Rx = require('./rx').default;
var {encodeObject} = require('./util').default;
var {isArray, merge} = require('./underscore_ext').default;

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
