'use strict';

var config = require('./webpack.config');

config.output.filename = "testBundle.js";
config.output.publicPath = "";
config.entry = 'mocha!./test/all.js';
module.exports = config;
