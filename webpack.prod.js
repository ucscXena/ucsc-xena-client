/*global require: false, module: false */
'use strict';
var webpack = require('webpack');
var config = require('./webpack.config');

config.output.filename = "[name].[chunkhash].js";
config.output.chunkFilename = "[chunkhash].bundle.js";
config.plugins = config.plugins.concat([
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.OccurenceOrderPlugin(true),
	new webpack.DefinePlugin({
		"process.env": {
			NODE_ENV: '"production"' // disable reactjs run-time checks, docs, etc.
		}
	})
]);

module.exports = config;
