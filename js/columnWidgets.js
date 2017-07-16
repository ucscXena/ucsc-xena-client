'use strict';

var multi = require('./multi');

var fieldTypeSelector = x => x.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	transform: multi(fieldTypeSelector),
	avg: multi(fieldTypeSelector),
	download: multi(columnFieldTypeSelector),
    specialDownload: multi(columnFieldTypeSelector),
	column: multi(columnFieldTypeSelector),
	legend: multi(columnFieldTypeSelector),
	pdf: multi(fieldTypeSelector)
};

widget.index.dflt = () => null;
widget.avg.dflt = () => null;

module.exports = widget;
