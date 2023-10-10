/*global require: false, module: false, process: false */
var webpack = require('webpack');
var config = require('./webpack.config');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserJSPlugin = require('terser-webpack-plugin');
const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');


delete config.entry.docs;              // Remove docs from production build.
config.mode = 'production';
config.output.filename = "[name].[chunkhash].js";
config.output.chunkFilename = "[chunkhash].bundle.js";
console.log(config.optimization);
config.optimization = {
	minimizer: [
		new TerserJSPlugin({cache: true, parallel: true, sourceMap: true}),
		new OptimizeCSSAssetsPlugin({})]
};
config.plugins = config.plugins.concat([
	new MiniCssExtractPlugin({
		filename: '[name].[contenthash].css'
	}),
/*	new webpack.optimize.CommonsChunkPlugin({name: 'init', filename: "init.[chunkhash].js"}) */
]);

// Amend css loaders with MiniCssExtractPlugin.
config.module.rules.forEach(function (rule) {
	if (rule.use && rule.use[0] && rule.use[0].loader === 'style-loader') {
		rule.use = [MiniCssExtractPlugin.loader].concat(rule.use.slice(1));
	}
});
module.exports = config;
