'use strict';

var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var config = require('./webpack.config');

config.output.filename = "testBundle.js";
config.output.publicPath = "";
config.entry = {test: 'mocha?delay=true!./test/all.js'};
config.plugins = [
	new HtmlWebpackPlugin({
		title: "UCSC Xena",
		filename: "index.html",
		template: "test.template"
	}),
	new webpack.OldWatchingPlugin()
];

module.exports = config;
