'use strict';

var multi = require('./multi');
var parsePos = require('./parsePos');

var fieldTypeSelector = x => x.fieldType;
var fieldTypeOrSamplesSelector = (id, x) => id === 'samples' ? 'samples' : x.fieldType;
var columnFieldTypeOrSamplesSelector = x => x.id === 'samples' ? 'samples' : x.column.fieldType;
var columnFieldTypeSelector = x => x.column.fieldType;

// XXX check for null field[0] is an odd artifact of denseMatrix transform which
// overwrites fields with probes, if the server returns probes. If a gene is not
// recognized, the probe list is empty. Needs a better semantics.
var annotationSelector = ({fields, refGene}) =>
	parsePos(fields[0] || '') ? 'chrom' : (refGene ? 'gene' : null);

var widget = {
	cmp: multi(fieldTypeSelector),
	index: multi(x => x),
	transform: multi(fieldTypeSelector),
	avg: multi(fieldTypeSelector),
	download: multi(columnFieldTypeSelector),
    specialDownload: multi(columnFieldTypeSelector),
	column: multi(columnFieldTypeOrSamplesSelector),
	legend: multi(columnFieldTypeOrSamplesSelector),
	pdf: multi(fieldTypeOrSamplesSelector),
	annotation: multi(annotationSelector)
};

widget.index.dflt = () => null;
widget.avg.dflt = () => null;
widget.annotation.dflt = () => null;

module.exports = widget;
