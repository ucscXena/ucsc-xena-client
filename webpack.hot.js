/*global require: false, module: false */
'use strict';
var webpack = require('webpack');
var config = require('./webpack.config');

function wrapEntry(entry) {
	if (entry instanceof Array) {
		return entry;
	}
	return [entry];
}

config.entry = [
	'webpack-dev-server/client?http://0.0.0.0:8080', // WebpackDevServer host and port
	'webpack/hot/only-dev-server' // "only" prevents reload on syntax errors

].concat(wrapEntry(config.entry));

function find(arr, fn) {
	for (var i = 0; i < arr.length; ++i) {
		if (fn(arr[i])) {
			return arr[i];
		}
	}
	return undefined;
}

var jsLoader = find(config.module.loaders,
	function (l) { return l.type === 'js'; });
jsLoader.loaders = ['react-hot'].concat(jsLoader.loaders);

config.plugins = config.plugins.concat([
	new webpack.HotModuleReplacementPlugin()
]);

config.devtool = 'eval';

module.exports = config;
