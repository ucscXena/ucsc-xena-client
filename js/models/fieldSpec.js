
import * as _ from '../underscore_ext.js';

var canEdit = ([type]) => type === 'geneSignature';

function supportsEdit(fs) {
	return fs.fetchType === 'signature' ? canEdit(fs.signature) : true;
}

var setFieldType = _.curry((type, fs) =>
	_.dissoc(_.assoc(fs, 'fieldType', type), 'xzoom'));

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

export { setFieldType, signatureField, supportsEdit };
