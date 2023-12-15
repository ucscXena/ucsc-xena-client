
var multi = require('./multi');

var fieldTypeSelector = x => x.fieldType;
var fieldTypeOrSamplesSelector = (id, x) => id === 'samples' ? 'samples' : x.fieldType;
var columnFieldTypeOrSamplesSelector = x => x.id === 'samples' ? 'samples' : x.column.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	data: multi(fieldTypeSelector),
	transform: multi(fieldTypeSelector),
	avg: multi(fieldTypeSelector),
	download: multi(columnFieldTypeSelector),
    specialDownload: multi(columnFieldTypeSelector),
	column: multi(columnFieldTypeOrSamplesSelector),
	legend: multi(columnFieldTypeOrSamplesSelector),
	pdf: multi(fieldTypeOrSamplesSelector),
};

widget.index.dflt = () => null;
widget.avg.dflt = () => null;
widget.data.dflt = (column, data) => data;

module.exports = widget;
