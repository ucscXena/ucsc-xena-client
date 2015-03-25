var webpack = require('webpack');
var config = require('./webpack.config');

config.output.filename = "testBundle.js";
config.entry = 'mocha!./test/all.js';
module.exports = config;
