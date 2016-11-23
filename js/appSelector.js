/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var {createSelectorCreator, defaultMemoize} = require('reselect');
var {createFmapSelector} = require('./selectors');
var widgets = require('./columnWidgets');
var km = require('./models/km');
var {lookupSample} = require('./models/sample');

var createSelector = createSelectorCreator(defaultMemoize, _.isEqual);

var indexSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				_.getIn(column, ['fieldType']),
				state.data[key]]),
		args => widgets.index(...args));

function cmpString(s1, s2) {
	if (s1 > s2) {
		return 1;
	} else if (s2 > s1) {
		return -1;
	}
	return 0;
}

var sortSelector = createSelector(
	state => state.samples,
	state => state.cohortSamples,
	state => _.fmap(state.columns, c => _.pick(c, 'fieldType', 'fields', 'xzoom', 'sortVisible')),
	state => state.columnOrder,
	state => state.data,
	state => state.index,
	(samples, cohortSamples, columns, columnOrder, data, index) => {
		var getSampleID = lookupSample(cohortSamples),
			cmpFns = _.fmap(columns,
				(c, id) => widgets.cmp(columns[id], data[id], index[id])),
			// XXX should further profile this to see how much it's costing us
			// to create a findValue callback on every cmpFn call.
			cmpFn = (s1, s2) =>
				_.findValue(columnOrder, id => cmpFns[id](s1, s2)) ||
					cmpString(getSampleID(s1), getSampleID(s2));

		return (samples || []).slice(0).sort(cmpFn);
	}
);

// This could be further optimized to eliminate the mergeKeys calls, below, which will
// re-create every column object on every state update, regardless of whether the column
// has changed. We never have more than about ten columns, so it's probably pointless to do
// so.
var transformSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				_.omit(column, 'user'), // ugh. Review column schema + widget.transform.
				_.getIn(column, ['vizSettings']),
				state.data[key],
				state.samples,
				state.datasets,
				state.index[key]]),
		_.apply(widgets.transform));

var mergeKeys = (a, b) => _.mapObject(a, (v, k) => _.merge(v, b[k]));

var kmSelector = createSelector(
		state => state.samples,
		state => _.getIn(state, ['columns', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['data', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['index', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['km', 'cutoff']),
		state => state.survival,
		(samples, column, data, index, cutoff, survival) =>
			column && survival && km.makeGroups(column, data, index, cutoff, survival, samples));

var index = state => ({...state, index: indexSelector(state)});
var sort = state => ({...state, samples: sortSelector(state)});
var transform = state => ({...state, columns: mergeKeys(state.columns, transformSelector(state))});

// kmGroups transform calculates the km data, and merges it into the state.km object.

var kmGroups = state => ({...state, km: {
	...state.km,
	groups: kmSelector(state)}});

///////
// This is the main transform ('selector') of the application state, before passing to the view.
// We build indexes of the column data, sort samples by the column data, transform
// the data for display (e.g. map to colors), and calculate km if a km plot is requested.
//
// The result of the transforms is a state object with the calculated values merged.
// The transforms are memoized for performance.

var selector = state => kmGroups(transform(sort(index(state))));

module.exports = selector;
