/* required for running loadXenaQueries during dist */

var config = require('./webpack.config');
config.plugins = [];
config.entry = {loadXenaQueries: './js/loadXenaQueries'};
config.output = {
	path: __dirname + "/dist",
	filename: 'loadXenaQueries.js',
	library: 'xenaQueries',
	libraryTarget: 'commonjs2',
	clean: true
};

module.exports = config;
