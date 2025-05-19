//var webpack = require('webpack');
var config = require('./webpack.config');

config.devServer.hot = true;

config.devtool = 'eval-source-map';

module.exports = config;
