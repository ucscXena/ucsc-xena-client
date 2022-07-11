/*global require: false, module: false, __dirname: false */
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');

var postcssPlugins = [
	require('postcss-for'),
	require('postcss-cssnext'),
	require('postcss-modules-values')
];

var htmlPlugin = process.argv.indexOf('--disable-html-plugin') === -1 ?
	[new HtmlWebpackPlugin({
		title: "UCSC Xena",
		filename: "index.html",
		inject: false,
		//template: "!!blueimp-tmpl-loader!page.template"
		template: "page.template"
	})] : [];

module.exports = {
	mode: 'development',
	entry: {heatmap: './js/main', docs: './js/docs', bookmarks: './js/admin/bookmarks.js'},
	output: {
		path: __dirname + "/build",
		publicPath: "../",
		filename: "[name].js"
	},
	devServer: {
		host: "localhost",
		publicPath: '/',
		disableHostCheck: true,
		historyApiFallback: true,
		headers: {
			"Content-Security-Policy-Report-Only": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; connect-src *; img-src * data:; frame-src 'self' ucscxena: https://www.youtube.com https://xenageneset.berkeleybop.io/xena/"
		},
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
		rules: [
			{ test: /loadXenaQueries.js$/, loader: "val-loader" },
			{ test: /\.xq$/, loader: "raw-loader" },
			//// bunch of special loading required for pdfkit
			{
				test: /png-js|fontkit[/\\]index.js$|unicode-properties[/\\]index.js$/,
				use: [
					{ loader: 'transform-loader', options: { brfs: true } },
					{ loader: 'babel-loader' }
				]
			},
			{
				test: /pdfkit.js/,
				use: [
					{ loader: 'transform-loader', options: { brfs: true } },
					{ loader: 'babel-loader' }
				]
			},
			{ test: path => path.match(/@hms-dbmi[/\\]viv[/\\].*.jsx?/),
				loader: "babel-loader"},
			{ test: path => path.match(/ucsc-xena-viv[/\\].*.jsx?/),
				loader: "babel-loader"},
			{ test: /dfa[/\\]index.js/, loader: "babel-loader" },
			{ test: /svg-to-pdfkit[/\\]source.js/, loader: "babel-loader" },
			{ test: /unicode-trie[/\\]index.js/, loader: "babel-loader" },
			{ test: /unicode-trie[/\\]swap.js/, loader: "babel-loader" },
			{ test: /linebreak[/\\]src[/\\]pairs.js/, loader: "babel-loader" },
			{
				test: /linebreak[/\\]src[/\\]linebreaker.js/,
				use: [
					{ loader: 'transform-loader', options: { brfs: true } },
					{ loader: 'babel-loader' }
				]
			},
			{ test: /unicode-properties[/\\]unicode-properties.browser.cjs.js/, loader: "babel-loader" },
			{ test: /src[/\\]assets/, loader: "arraybuffer-loader" },
			// If a library includes a sourcemap tag the browser will get the
			// url wrong unless we handle it with source-map-loader. Limit
			// it to libs that need it, to avoid build overhead.
			{ test: /rxjs[/\\].*\.js|sockjs-client|underscore[/\\]underscore\.js|react-draggable|showdown[/\\]dist/, enforce: "pre", use: ["source-map-loader"]},
			{ test: /\.afm$/, loader: "raw-loader" },
			{
				test: /\.jsx?$/,
				include: [
					path.join(__dirname, 'js'),
					path.join(__dirname, 'test'),
					path.join(__dirname, 'doc')
				],
				loader: ['babel-loader']
			},
			{
				// css modules
				test: path => path.match(/\.css$/) && (path.indexOf('toolbox') !== -1 || path.match(/\.module\.css$/)),
				// must be two-element array. See webpack.prod.js
				use: [
					{ loader: 'style-loader'},
					{
						loader: 'css-loader',
						options: {
							sourceMap: true,
							modules: {
								localIdentName: '[name]__[local]___[hash:base64:5]'
							},
							importLoaders: 1,
						}
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: true,
							sourceComments: true,
							plugins: () => postcssPlugins
						}
					}
				]
			},
			{
				// 'modules' breaks existing css, so handle them separately
				test: path => path.match(/\.css$/) && !(path.indexOf('toolbox') !== -1 || path.match(/\.module\.css$/)),
				// must be two-element array. See webpack.prod.js
				use: [
					{ loader: 'style-loader' },
					{
						loader: 'css-loader',
						options: {
							importLoaders: 1,
						}
					},
					{
						loader: 'postcss-loader',
						options: {
							sourceMap: true,
							plugins: () => postcssPlugins
						}
					}
				]
			},
			{
				test: /\.(jpe?g|png|gif|svg|eot|woff2?|ttf)$/i,
				loader: 'file-loader'
			}
		]
	},
	plugins: htmlPlugin.concat([]),
	resolve: {
		// pdfkit exports es6 modules, which webpack will prefer by default, but
		// getting them to build correctly is extremely complicated. So, we configure
		// webpack to prefer commonjs modules ('main').
		mainFields: ['browser', 'main', 'module'],
		alias: {
			'redboxOptions': path.join(__dirname, 'redboxOptions.json'),
			'redux-devtools': path.join(__dirname, 'js/redux-devtool-shim'),
			'fs': 'pdfkit/js/virtual-fs.js',
			'txml/txml': 'txml/dist/txml'
		},
		symlinks: false,
		extensions: ['.js', '.jsx', '.json']
	}
};
