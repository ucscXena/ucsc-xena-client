/*global require: false, module: false, process: false */
'use strict';
var webpack = require('webpack');
var config = require('./webpack.config');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

process.env.NODE_ENV = '"production"'; // * Not sure why needed both here & in a plugin.
                                       // Without this babel will not see it.

delete config.entry.docs;              // Remove docs from production build.
config.output.filename = "[name].[chunkhash].js";
config.output.chunkFilename = "[chunkhash].bundle.js";
config.plugins = config.plugins.concat([
	new webpack.optimize.UglifyJsPlugin(),
	new webpack.optimize.OccurenceOrderPlugin(true),
	new webpack.DefinePlugin({
		"process.env.NODE_ENV": '"production"' // * see above.
	}),
	new ExtractTextPlugin("[name].[contenthash].css", {allChunks: false}),
	new webpack.optimize.CommonsChunkPlugin({name: 'init', filename: "init.[chunkhash].js"})
]);

// Amend css loaders with ExtractTextPlugin, to prevent a
// flash of unstyled content (fouc) on page load. This assumes
// the loaders property looks like ['style-loader', loader].
//
// ExtractTextPlugin builds css files per-entry chunk, which required
// reconfiguring webpack to have an entry per-page, and dropping bogorouter.js.
// Routing is now in page.template.
config.module.loaders.forEach(function (loader) {
	if (loader.extract) {
		loader.loader = ExtractTextPlugin.extract('style-loader', loader.loaders[1]);
		delete loader.loaders;
	}
});

module.exports = config;
