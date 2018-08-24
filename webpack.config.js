/*global require: false, module: false, __dirname: false */
'use strict';
var HtmlWebpackPlugin = require('html-webpack-plugin');
var webpack = require('webpack');
var path = require('path');
var reactToolboxVariables = require('./reactToolboxVariables');

var htmlPlugin = process.argv.indexOf('--disable-html-plugin') === -1 ?
	[new HtmlWebpackPlugin({
		title: "UCSC Xena",
		filename: "index.html",
		template: "page.template"
	})] : [];

module.exports = {
	historyApiFallback: true,
	entry: {heatmap: './js/main', docs: './js/docs', register: './js/register', bookmarks: './js/admin/bookmarks.js'},
	output: {
		path: __dirname + "/build",
		publicPath: "../",
		filename: "[name].js"
	},
	devServer: {
		host: "localhost",
		publicPath: '/',
		disableHostCheck: true,
		proxy: {
			'/api/**': {
				changeOrigin: true,
				target: 'http://dev.xenabrowser.net/api',
				// For local django dev, use this instead & remove changeOrigin.
//				target: 'http://localhost:8000/',
				pathRewrite: {'^/api': ''}
			}
		}
	},
	module: {
		loaders: [
			{ test: /loadXenaQueries.js$/, loader: "val" },
			{ test: /\.xq$/, loader: "raw" },
			{ test: /pdfkit|png-js/, loader: "transform?brfs" },
			{
				test: /\.js$/,
				include: [
					path.join(__dirname, 'js'),
					path.join(__dirname, 'test'),
					path.join(__dirname, 'doc')
				],
				loaders: ['babel-loader'],
				type: 'js'
			},
			{
				// css modules
				test: path => path.match(/\.css$/) && (path.indexOf('toolbox') !== -1 || path.match(/\.module\.css$/)),
				// must be two-element array. See webpack.prod.js
				loaders: [
					'style-loader',
					'css-loader?sourceMap&modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]!postcss?sourceMap&sourceComments',
				],
				extract: true // XXX see webpack.prod.js
			},
			{
				// 'sourceMap' and 'modules' breaks existing css, so handle them separately
				test: path => path.match(/\.css$/) && !(path.indexOf('toolbox') !== -1 || path.match(/\.module\.css$/)),
				// must be two-element array. See webpack.prod.js
				loaders: [
					'style-loader',
					'css-loader?importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]!postcss?sourceMap&sourceComments'
				],
				extract: true // XXX see webpack.prod.js
			},
			{ test: /\.json$/, loader: "json" },
			{ test: /\.(jpe?g|png|gif|svg|eot|woff2?|ttf)$/i, loaders: ['url?limit=10000'] }
		]
	},
	plugins: htmlPlugin.concat([
		new webpack.OldWatchingPlugin()
	]),
	resolveLoader: {
		// http://webpack.github.io/docs/troubleshooting.html#npm-linked-modules-doesn-t-find-their-dependencies
		fallback: path.join(__dirname, "node_modules")  // handle 'npm ln' for loaders
	},
	resolve: {
		fallback: path.join(__dirname, "node_modules"), // handle 'npm ln'
		alias: {
			'redboxOptions': path.join(__dirname, 'redboxOptions.json'),
			'redux-devtools': path.join(__dirname, 'js/redux-devtool-shim')
		},
		extensions: ['', '.js', '.json', '.coffee']
	},
	postcss: () => {
		return [
			require('postcss-cssnext')({
				features: {
					customProperties: {
						variables: reactToolboxVariables
					}
				}
			}),
			require('postcss-modules-values'),
		];
	}
};
