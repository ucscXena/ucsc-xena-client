'use strict';

var _ = require('../underscore_ext');

var canEdit = ([type]) => type === 'geneSignature';

function supportsEdit(fs) {
	return fs.fetchType === 'signature' ? canEdit(fs.signature) : true;
}

var setFieldType = _.curry((type, fs) => _.assoc(fs, 'fieldType', type));

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
