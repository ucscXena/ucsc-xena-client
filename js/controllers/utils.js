/*eslint-env browser */
/*global require: false, module: false */

'use strict';

var _ = require('../underscore_ext');
var paths = require('./paths');
var widgets = require('../columnWidgets');

function cmpString(s1, s2) {
	if (s1 > s2) {
		return 1;
	} else if (s2 > s1) {
		return -1;
	}
	return 0;
}

function updateColumnDisplay(state, colID) {
	var col = _.getIn(state, [...paths.columns, colID]),
		{dsID} = col,
		viz = _.getIn(state, [...paths.vizSettings, 'dsID']),
		samples = _.getIn(state, paths.samples),
		dataset = _.getIn(state, [...paths.datasets, 'datasets', dsID]),
		data = _.getIn(state, [...paths.data, colID]);
	return _.assocIn(state, [...paths.data, colID, 'display'],
			widgets.transform(col, viz, data, samples, dataset));
}

function updateAllColumns(state) {
	return _.keys(_.getIn(state, paths.columns)).reduce(updateColumnDisplay, state);
}

function sortSamples(state) {
	const order = _.getIn(state, paths.columnOrder),
		columns = _.getIn(state, paths.columns),
		data = _.getIn(state, paths.data),
		samples = _.getIn(state, paths.samples);

	var cmpFns = _.fmap(columns, (c, id) => widgets.cmp(columns[id], data[id])),
		cmpFn = (s1, s2) =>
			_.findValue(order, id => cmpFns[id](s1, s2)) ||
			cmpString(s1, s2); // XXX add cohort as well

	return updateAllColumns(_.assocIn(state, paths.samples, samples.slice(0).sort(cmpFn)));
}

module.exports = {
	sortSamples: sortSamples
};
