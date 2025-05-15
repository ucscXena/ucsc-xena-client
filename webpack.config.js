var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');

var postcssPlugins = [
	require('postcss-for'),
	require('postcss-preset-env')({ stage: 3 }),
	require('postcss-modules-values')
];

var plugins = [];
process.argv.indexOf('--disable-html-plugin') === -1 &&
	plugins.push(
		new HtmlWebpackPlugin({
			title: "UCSC Xena",
			filename: "index.html",
			inject: false,
			//template: "!!blueimp-tmpl-loader!page.template"
			template: "page.template"
		}));

if (process.argv.indexOf('--statoscope') !== -1) {
	var StatoscopePlugin = require('@statoscope/webpack-plugin').default;
	plugins.push(
		new StatoscopePlugin({
			saveTo: 'build/statoscope-report.html',
			saveStatsTo: 'build/stats.json',
			open: false,
			statsOptions: {
				all: false,
				hash: true,
				entrypoints: true,
				chunks: true,
				chunkModules: true,
				nestedModules: true,
				children: true,
				moduleTrace: true,
				dependencyTrace: true,
				chunkOrigins: true,
				assets: true,
				reasons: true,
				performance: true,
				ids: true
			},
		}));
}

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
				target: 'https://dev.xenabrowser.net/api',
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
							postcssOptions: {plugins: postcssPlugins}
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
							postcssOptions: {plugins: postcssPlugins}
						}
					}
				]
			},
			{ test: /\.wasm$/, type: 'javascript/auto', loader: 'arraybuffer-loader' },
			{
				test: /\.(jpe?g|png|gif|svg|eot|woff2?|ttf)$/i,
				loader: 'file-loader'
			}
		]
	},
	plugins: plugins.concat([
		{
			// workaround for webpack ignoring SIGINT
			apply(/*compiler*/) {
				process.on('SIGINT', () => {
					console.log('Shutting down Webpack...');
					process.exit(0); // Force exit
				});
			},
		},
	]),
	resolve: {
		mainFields: ['browser', 'module', 'main'],
		alias: {
			'redboxOptions': path.join(__dirname, 'redboxOptions.json'),
			'redux-devtools': path.join(__dirname, 'js/redux-devtool-shim'),
			// resolve this completely so the pdfkit alias doesn't break it.
			'fs': require.resolve('pdfkit/js/virtual-fs.js'),
			'txml/txml': 'txml/dist/txml',
			'./connector': path.resolve(__dirname, 'js/connector-dev.js')
		},
		symlinks: false,
		extensions: ['.js', '.jsx', '.json']
	}
};
