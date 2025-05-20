var HtmlWebpackPlugin = require('html-webpack-plugin');
var config = require('./webpack.config');

config.output.filename = "testBundle.js";
config.output.publicPath = "";
config.devServer.hot = false;
// need delay for wasm loading, which is used in draw and scale
// tests.
config.entry = {test: 'mocha-loader!./test/all.js'};
config.plugins = [
	new HtmlWebpackPlugin({
		title: "UCSC Xena",
		filename: "index.html",
		inject: false,
		template: "test.template"
	})
];

module.exports = config;
