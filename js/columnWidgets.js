/*global require: false module: false */
'use strict';

var multi = require('./multi');

var fieldTypeSelector = x => x.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	transform: multi(fieldTypeSelector),
	download: multi(columnFieldTypeSelector),
	column: multi(columnFieldTypeSelector),
	legend: multi(columnFieldTypeSelector),
	pdf: multi(fieldTypeSelector)
};

widget.index.dflt = () => null;

module.exports = widget;
