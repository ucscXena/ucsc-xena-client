/*global module: false require: false, process: false */
'use strict';
if (process.env.NODE_ENV === 'production') {
	module.exports = require('connector-prod.js');
} else {
	module.exports = require('connector-dev.js');
}

