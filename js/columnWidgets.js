/*global require: false module: false */
'use strict';

var multi = require('./multi');
var parsePos = require('./parsePos');

var fieldTypeSelector = x => x.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;
var annotationSelector = ({fields, refGene}) =>
	parsePos(fields[0]) ? 'chrom' : (refGene ? 'gene' : null);

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	transform: multi(fieldTypeSelector),
	avg: multi(fieldTypeSelector),
	download: multi(columnFieldTypeSelector),
    specialDownload: multi(columnFieldTypeSelector),
	column: multi(columnFieldTypeSelector),
	legend: multi(columnFieldTypeSelector),
	pdf: multi(fieldTypeSelector),
	annotation: multi(annotationSelector)
};

widget.index.dflt = () => null;
widget.avg.dflt = () => null;
widget.annotation.dflt = () => null;

module.exports = widget;
