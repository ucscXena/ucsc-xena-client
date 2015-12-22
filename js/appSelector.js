/*global require: false, module: false */
'use strict';

var _ = require('underscore_ext');
var {createSelector} = require('reselect');
var {createFmapSelector} = require('./selectors');
var widgets = require('./columnWidgets');

var indexSelector = createFmapSelector(
		state => _.fmap(state.columns,
			({dataType}, key) => [dataType, state.data[key]]),
		args => widgets.index(...args));

function cmpString(s1, s2) {
	if (s1 > s2) {
		return 1;
	} else if (s2 > s1) {
		return -1;
	}
	return 0;
}

var sortSelector =  createSelector(
	state => state.samples,
	state => _.fmap(state.columns, c => _.pick(c, 'dataType', 'fields')),
	state => state.columnOrder,
	state => state.data,
	state => state.index,
	(samples, columns, columnOrder, data, index) => {
		var cmpFns = _.fmap(columns,
				(c, id) => widgets.cmp(columns[id], data[id], index[id])),
			cmpFn = (s1, s2) =>
				_.findValue(columnOrder, id => cmpFns[id](s1, s2)) ||
					cmpString(s1, s2); // XXX add cohort as well

		return samples.slice(0).sort(cmpFn);
	}
);

var transformSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				column,
				_.getIn(state, ['vizSettings', state.dsID]),
				state.data[key],
				state.samples,
				state.datasets.datasets[column.dsID],
				state.index[key],
				state.zoom]),
		([column, ...args]) => ({...column, ...widgets.transform(column, ...args)}));

var index = state => ({...state, index: indexSelector(state)});
var sort = state => ({...state, samples: sortSelector(state)});
var transform = state => ({...state, columns: transformSelector(state)});

var selector = state => transform(sort(index(state)));

module.exports = selector;
