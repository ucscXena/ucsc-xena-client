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


module.exports = {
	xenaFieldPaths,
	updateFields,
	mergeDsIDs
};
