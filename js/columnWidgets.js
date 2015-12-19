/*global require: false module: false */
'use strict';

var multi = require('multi');

var dataTypeSelector = x => x.dataType;

var widget = {
	cmp: multi(dataTypeSelector),
	fetch: multi(dataTypeSelector),
	index: multi(x => x),
	transform: multi(dataTypeSelector),
	column: multi(x => x.column.dataType)
};

widget.index.dflt = () => null;

module.exports = widget;
