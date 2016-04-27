/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');

// return xena field paths.
function xenaFieldPaths(fs, path = [], acc = []) {
	return fs.fetchType === 'xena' ?  [...acc, path] :
		(fs.fetchType === 'composite' ?
			 [...acc, ..._.flatmap(fs.fieldSpecs,
				 (fs, i) => xenaFieldPaths(fs, [...path, 'fieldSpecs', i], acc))] :
			 []);
}

// Update nested 'fields' properties under fieldSpec given
// by 'paths', to values in 'fields'.
function updateFields(fieldSpec, paths, fields) {
	return _.reduce(_.zip(paths, fields), (acc, [path, field]) =>
				_.assocIn(acc, [...path, 'fields'], field),
			fieldSpec);
}

function mergeDsIDs(dsIDs, fieldSpecs) {
	// Preserve null fs. Otherwise we get a {dsID: undefined} fieldSpec, which
	// is nonsensical.
	return _.mmap(fieldSpecs, dsIDs, (fs, dsID) => fs && _.assoc(fs, 'dsID', dsID));
}

var sVTCases = {
	'null': (type, fs) => fs,
	'xena': (type, fs) => _.assoc(fs, 'fieldType', type),
	'composite': (type, fs) => _.assoc(fs, 'fieldType', type,
									   'fieldSpecs', _.map(fs.fieldSpecs, setFieldType(type)))
};

// It's a bit unclear how this should behave. For now the use case
// is setting genes or geneProbes, walking over composite fields as
// necessary.
var setFieldType = _.curry((type, fs) => sVTCases[fs.fetchType](type, fs));

var nullField = {
	fetchType: 'null',
	valueType: 'null',
	fieldType: 'null',
	colorClass: 'null',
	fields: []
};

var assocInOrReplace = (obj, keys, val) =>
	keys.length === 0 ? val : _.assocIn(obj, keys, val);

// Replace all fields not in datasets with nullField.
var filterByDsID = _.curry((datasets, fieldSpec) => {
	var xfp = _.filter(xenaFieldPaths(fieldSpec),
			p => !_.has(datasets, _.getIn(fieldSpec, [...p, 'dsID'])));

	return _.reduce(xfp, (acc, p) => assocInOrReplace(acc, p, nullField), fieldSpec);
});

var allNullFields = fieldSpecs => _.every(fieldSpecs, fs => fs.fetchType === 'null');

module.exports = {
	xenaFieldPaths,
	updateFields,
	mergeDsIDs,
	setFieldType,
	nullField,
	allNullFields,
	filterByDsID
};
