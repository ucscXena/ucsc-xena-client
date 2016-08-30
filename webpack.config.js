/*global require: false, module: false, __dirname: false */
'use strict';
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var path = require('path');

module.exports = {
	historyApiFallback: true,
	entry: "./js/bogorouter",
	output: {
		path: __dirname + "/build",
		publicPath: "../",
		filename: "[name].js"
	},
	devServer: {
		publicPath: '/'
	},
	module: {
		loaders: [
			{ test: /pdfkit|png-js/, loader: "transform?brfs" },
			{ test: /rx-dom/, loader: "imports?define=>false" },
			{
				test: /\.js$/,
				include: [
					path.join(__dirname, 'js'),
					path.join(__dirname, 'test'),
					path.join(__dirname, 'doc')
				],
				loaders: ['babel-loader'],
				type: 'js'},
			{ test: /\.css$/, loader: "style!css" },
			{ test: /\.json$/, loader: "json" },
			{ test: /\.(jpe?g|png|gif|svg|eot|woff2?|ttf)$/i, loaders: ['url?limit=10000'] }
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: "UCSC Xena",
			filename: "index.html",
			template: "page.template"
		}),
		new webpack.OldWatchingPlugin()
	],
	resolve: {
		fallback: path.join(__dirname, "node_modules"),
		alias: {
			rx$: 'rx/dist/rx',
			'rx.binding$': 'rx/dist/rx.binding',
			'rx.async$': 'rx/dist/rx.async',
			'rx.time$': 'rx/dist/rx.time',
			'rx.experimental$': 'rx/dist/rx.experimental',
			'rx.aggregates$': 'rx/dist/rx.aggregates',
			'rx.coincidence$': 'rx/dist/rx.coincidence'
		},
		extensions: ['', '.js', '.json', '.coffee']
	}
};
