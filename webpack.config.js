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
			//// bunch of special loading required for pdfkit
			{ test: /png-js|fontkit[/\\]index.js$|unicode-properties[/\\]index.js$/, loader: "transform?brfs!babel" },
			{ test: /pdfkit.js/, loader: "transform?brfs!babel" },
			{ test: /dfa[/\\]index.js/, loader: "babel" },
			{ test: /svg-to-pdfkit[/\\]source.js/, loader: "babel" },
			{ test: /unicode-trie[/\\]index.js/, loader: "babel" },
			{ test: /unicode-trie[/\\]swap.js/, loader: "babel" },
			{ test: /linebreak[/\\]src[/\\]pairs.js/, loader: "babel" },
			{ test: /linebreak[/\\]src[/\\]linebreaker.js/, loader: "transform?brfs!babel" },
			{ test: /unicode-properties[/\\]unicode-properties.browser.cjs.js/, loader: "babel" },
			{ test: /src[/\\]assets/, loader: "arraybuffer" },
			{ test: /\.afm$/, loader: "raw" },
			////
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
			{ test: /\.wasm$/, loaders: ['arraybuffer-loader'] },
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
			'redux-devtools': path.join(__dirname, 'js/redux-devtool-shim'),
			//'fs': path.join(__dirname, 'empty') // hack for emscripten preamble.js
			'fs': 'pdfkit/js/virtual-fs.js'
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
