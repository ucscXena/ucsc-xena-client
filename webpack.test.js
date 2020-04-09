var HtmlWebpackPlugin = require('html-webpack-plugin');
var config = require('./webpack.config');

config.output.filename = "testBundle.js";
config.output.publicPath = "";
config.entry = {test: 'mocha-loader!./test/all.js'};
config.plugins = [
	new HtmlWebpackPlugin({
		title: "UCSC Xena",
		filename: "index.html",
		inject: false,
		template: "!!blueimp-tmpl-loader!test.template"
	})
];

module.exports = config;
