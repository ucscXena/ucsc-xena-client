/*global require: false module: false */
'use strict';

var multi = require('./multi');

var fieldTypeSelector = x => x.fieldType;

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	transform: multi(fieldTypeSelector),
	column: multi(x => x.column.fieldType),
	legend: multi(x => x.column.fieldType),
	pdf: multi(fieldTypeSelector)
};

widget.index.dflt = () => null;

module.exports = widget;
