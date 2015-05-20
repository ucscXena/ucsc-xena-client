/*global require: false, module: false */
'use strict';
var multi = require('multi');

function getType([type, ...data]) {
	return type;
}

module.exports = {
	draw: multi(getType)
};
