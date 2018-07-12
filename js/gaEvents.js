/*global ga: false */
'use strict';

var config = require('./config');

var dispatch = (window.ga && config.ga_id) ?
	(...args) => window.ga('send', 'event', ...args) :
	(...args) => console.log('event', ...args);

module.exports = dispatch;
