var config = require('./webpack.config');
var path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

delete config.entry.docs;              // Remove docs from production build.
delete config.entry.bookmarks;         // Remove bookmarks from production build.
config.mode = 'production';
config.devtool = 'source-map';
config.output.filename = "[name].[contenthash].js";
config.output.chunkFilename = "[contenthash].bundle.js";
config.resolve.alias['./connector'] = path.resolve(__dirname, 'js/connector-prod.js');
config.optimization = {
	minimize: true
};
config.plugins = config.plugins.concat([
	new MiniCssExtractPlugin({
		filename: '[name].[contenthash].css'
	}),
]);

// Amend css loaders with MiniCssExtractPlugin.
config.module.rules.forEach(function (rule) {
	if (rule.use && rule.use[0] && rule.use[0].loader === 'style-loader') {
		rule.use = [MiniCssExtractPlugin.loader].concat(rule.use.slice(1));
	}
});
module.exports = config;
