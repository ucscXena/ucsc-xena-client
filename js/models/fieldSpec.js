'use strict';

var _ = require('../underscore_ext');

var canEdit = ([type]) => type === 'geneSignature';

function supportsEdit(fs) {
	return (
		fs.fetchType === 'signature' ? canEdit(fs.signature) :
		fs.fetchType === 'composite' ? _.every(fs.fieldSpecs, supportsEdit) :
		true);
}

var sVTCases = {
	'null': (type, fs) => fs,
	'xena': (type, fs) => _.assoc(fs, 'fieldType', type),
	'composite': (type, fs) => _.assoc(fs, 'fieldType', type,
									   'fieldSpecs', _.map(fs.fieldSpecs, setFieldType(type))) //eslint-disable-line no-use-before-define
};

// It's a bit unclear how this should behave. For now the use case
// is setting genes or geneProbes, walking over composite fields as
// necessary.
var setFieldType = _.curry((type, fs) => sVTCases[fs.fetchType](type, fs));

var signatureField = (fieldName, opts) => ({
	fetchType: 'signature',
	valueType: 'float',
	fieldType: 'clinical',
	colorClass: 'clinical',
	fields: [fieldName],
	columnLabel: 'signature',
	fieldLabel: fieldName,
	...opts
});

module.exports = {
	setFieldType,
	signatureField,
	supportsEdit
};
