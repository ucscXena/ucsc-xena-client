/*global require: false, module: false */
'use strict';
var webpack = require('webpack');
var config = require('./webpack.config');

var entries = Object.keys(config.entry);
for (var i = 0; i < entries.length; ++i) {
	config.entry[entries[i]] = [
		'webpack-dev-server/client?http://0.0.0.0:8080', // WebpackDevServer host and port
		'webpack/hot/only-dev-server', // "only" prevents reload on syntax errors
		config.entry[entries[i]]
	];
}

config.plugins = config.plugins.concat([
	new webpack.HotModuleReplacementPlugin()
]);
config.devServer.hot = true;

config.devtool = 'eval';

module.exports = config;
