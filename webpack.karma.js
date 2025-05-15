var config = require('./webpack.test');

// remove mocha-loader during karma testing, because karma
// handles invoking mocha.
config.entry = {test: './test/all.js'};

module.exports = config;
