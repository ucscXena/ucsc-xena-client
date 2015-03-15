// webpack client-side-haml loader
_ = require('underscore'); // ugh. Required for haml.
_.str = require('underscore.string');
var haml = require('haml/lib/haml');

var header = 'var haml = require("haml/lib/haml"); window._ = require("underscore"); module.exports = ';

module.exports = function (source) {
	this.cacheable();
	return header + haml.compileHaml({
		source: source,
		generator: 'productionjavascript'
	}).toString();
};
