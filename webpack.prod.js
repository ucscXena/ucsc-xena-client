/*global require: false, module: false, process: false */
var webpack = require('webpack');
var config = require('./webpack.config');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

process.env.NODE_ENV = '"production"'; // * Not sure why needed both here & in a plugin.
                                       // Without this babel will not see it.

delete config.entry.docs;              // Remove docs from production build.
config.output.filename = "[name].[chunkhash].js";
config.output.chunkFilename = "[chunkhash].bundle.js";
config.plugins = config.plugins.concat([
	new webpack.optimize.UglifyJsPlugin({
		sourceMap: true,
		compress: {
			warnings: true
		}
	}),
	new webpack.DefinePlugin({
		"process.env.NODE_ENV": '"production"' // * see above.
	}),
	new ExtractTextPlugin({filename: "[name].[contenthash].css", allChunks: true}),
	new webpack.optimize.CommonsChunkPlugin({name: 'init', filename: "init.[chunkhash].js"})
]);

// Amend css loaders with ExtractTextPlugin, to prevent a
// flash of unstyled content (fouc) on page load. This assumes
// the loaders property looks like ['style-loader', ...].
//
// ExtractTextPlugin builds css files per-entry chunk, which required
// reconfiguring webpack to have an entry per-page, and dropping bogorouter.js.
// Routing is now in page.template.
config.module.rules.forEach(function (rule) {
	if (rule.use && rule.use[0] && rule.use[0].loader === 'style-loader') {
		rule.loader = ExtractTextPlugin.extract({use: rule.use.slice(1)});
		delete rule.use;
	}
});
module.exports = config;
