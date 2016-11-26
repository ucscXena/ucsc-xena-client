// Load all xena queries
'use strict';

var glob = require("glob");

var files = glob.sync('./queries/*.xq', {cwd: __dirname});

module.exports = "module.exports = {" +
	files.map(function(file) {
		return '"' + file.replace(/.*\//, '').replace(/\.xq$/, '') + '": require("' + file + '")';
	}).join(',\n') + '};\n';
