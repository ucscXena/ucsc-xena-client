'use strict';

var util = require('./util');
var _ = require('./underscore_ext');

function parseServer(s) {
	// XXX should throw or otherwise indicate parse error on no match
	var tokens = s.match(/^(https?:\/\/)?([^:\/]+)(:([0-9]+))?(\/(.*))?$/),
		host = tokens[2],
		defproto = 'https://',
		proto = tokens[1] || defproto,
		defport = (proto === defproto) ? 443 : '7222',
		port = tokens[4] || defport,
		path = tokens[5] || '';

	return proto + host + (port ? ':' + port : '') + path;
}

// normalize: add http[s]? add port? Do standard replacements?
// What are our standard replacements?

module.exports = {
	hubParams: () => _.map(util.allParameters().hub, parseServer),
	parseServer
};
