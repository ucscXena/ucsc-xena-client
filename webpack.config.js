const webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var path = require('path');

var postcssPlugins = [
	require('postcss-for'),
	require('postcss-preset-env')({ stage: 3 }),
	require('postcss-modules-values')
];

var plugins = [
	new webpack.ProvidePlugin({
		Buffer: ['buffer', 'Buffer'],
		process: 'process/browser'
	})
];

process.argv.indexOf('--disable-html-plugin') === -1 &&
	plugins.push(
		new HtmlWebpackPlugin({
			title: "UCSC Xena",
			filename: "index.html",
			inject: false,
			template: "page.template",
			templateParameters: ({entrypoints}) => ({
				entryFiles: Object.fromEntries(Array.from(entrypoints.entries()).map(
					([key, value]) => [key, value.getFiles()]))
			})
		}));

if (process.env.hasOwnProperty('statoscope')) {
	var StatoscopePlugin = require('@statoscope/webpack-plugin').default;
	plugins.push(
		new StatoscopePlugin({
			saveTo: 'build/statoscope-report.html',
			saveStatsTo: 'build/stats.json',
			open: false,
			statsOptions: {
				all: false, // Disable all stats initially
				hash: true, // Include compilation hash
				entrypoints: true, // Include entrypoints information
				chunks: true, // Include chunks information
				chunkModules: true, // Include modules within chunks
				reasons: true, // Include reasons why modules are included
				ids: true, // Include IDs of modules and chunks
				dependentModules: true, // Include dependent modules of chunks
				chunkRelations: true, // Include chunk parents, children, and siblings
				cachedAssets: true, // Include information about cached assets
				nestedModules: true, // Include concatenated modules
				usedExports: true, // Include used exports
				providedExports: true, // Include provided imports
				assets: true, // Include assets information
				chunkOrigins: true, // Include origins of chunks
				version: true, // Include Webpack version
				builtAt: true, // Include build timestamp
				timings: true, // Include timing information
				performance: true, // Include performance hints
				//  source: true, // Include module sources (optional, increases stats file size)
			},
		}));
}

module.exports = /*env => */({
	mode: 'development',
	entry: {heatmap: './js/main', docs: './js/docs', bookmarks: './js/admin/bookmarks.js'},
	output: {
		path: __dirname + "/build",
		publicPath: "/",
		filename: "[name].js",
		clean: true
	},
	devtool: 'eval',
	devServer: {
		hot: false,
		static: {
			directory: path.join(__dirname, 'build'), // or appropriate path
		},
		allowedHosts: 'all',
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
			{ test: /\.xq$/, type: 'asset/source' },

			//// bunch of special loading required for pdfkit
			{ test: /\.afm$/, type: 'asset/source' },
			// bundle and load binary files inside static-assets folder as base64
			{
				test: /src[/\\]static-assets/,
				type: 'asset/inline',
				generator: {
					dataUrl: content => {
						return content.toString('base64');
					}

				}
			},
			// load binary files inside lazy-assets folder as an URL
			{
				test: /src[/\\]lazy-assets/,
				type: 'asset/resource'
			},
			//// end of special loading required for pdfkit

			// If a library includes a sourcemap tag the browser will get the
			// url wrong unless we handle it with source-map-loader. Limit
			// it to libs that need it, to avoid build overhead.
			{ test: /rxjs[/\\].*\.js|sockjs-client|underscore[/\\]underscore\.js|react-draggable|showdown[/\\]dist/, enforce: "pre", use: ["source-map-loader"]},
			{ test: /\.wasm$/, use:
				[{loader: path.resolve('loaders/arraybuffer-loader.js') }] },
			{
				test: /\.jsx?$/,
				include: [
					path.join(__dirname, 'js'),
					path.join(__dirname, 'test'),
					path.join(__dirname, 'doc')
				],
				loader: 'babel-loader'
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
			{
				test: /\.(jpe?g|png|gif|svg|eot|woff2?|ttf)$/i,
				type: 'asset/resource',
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
			'./connector': path.resolve(__dirname, 'js/connector-dev.js'),
		},
		symlinks: false,
		extensions: ['.js', '.jsx', '.json'],
		fallback: {
			stream: require.resolve("stream-browserify"),
			zlib: require.resolve("browserify-zlib"),
			buffer: require.resolve("buffer/"),
			path: require.resolve("path-browserify"),
			process: require.resolve('process/browser')
		}
	}
});
