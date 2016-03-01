/*global require: false, module: false, process: false */
'use strict';
var webpack = require('webpack');
var config = require('./webpack.config');

process.env.NODE_ENV = '"production"';         // * Not sure why needed both here & in a plugin.
                                               // Without this babel will not see it.
config.output.filename = "[name].[chunkhash].js";
config.output.chunkFilename = "[chunkhash].bundle.js";
config.plugins = config.plugins.concat([
	new webpack.optimize.UglifyJsPlugin(),
	new webpack.optimize.OccurenceOrderPlugin(true),
	new webpack.DefinePlugin({
		"process.env.NODE_ENV": '"production"' // * see above.
	})
]);

module.exports = config;
