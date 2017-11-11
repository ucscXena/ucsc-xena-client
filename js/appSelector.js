'use strict';

var _ = require('./underscore_ext');
var {createSelectorCreator, defaultMemoize} = require('reselect');
var {createFmapSelector} = require('./selectors');
var widgets = require('./columnWidgets');
var km = require('./models/km');
var {searchSamples} = require('./models/searchSamples');
var isPublicSelector = require('./isPublicSelector');

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

var invert = (dir, fn) => dir === 'reverse' ? (s1, s2) => fn(s2, s1) : fn;

var sortSelector = createSelector(
	state => state.cohortSamples,
	state => _.fmap(state.columns, c => _.pick(c, 'fieldType', 'fields', 'xzoom', 'sortVisible', 'sortDirection')),
	state => state.columnOrder,
	state => state.data,
	state => state.index,
	(cohortSamples, columns, columnOrder, data, index) => {
		var getSampleID = i => _.get(cohortSamples, i),
			order = columnOrder.slice(1), // skip 'samples' in sort
			cmpFns = _.fmap(columns,
				(c, id) => invert(c.sortDirection, widgets.cmp(columns[id], data[id], index[id]))),
			// XXX should further profile this to see how much it's costing us
			// to create a findValue callback on every cmpFn call.
			cmpFn = (s1, s2) =>
				_.findValue(order, id => cmpFns[id](s1, s2)) ||
					cmpString(getSampleID(s1), getSampleID(s2));

		return _.range((cohortSamples || []).length).slice(0).sort(cmpFn);
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
				state.index[key]]),
		_.apply(widgets.transform));

var avgSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				_.omit(column, 'user'), // Review column schema + widget.avg.
				state.data[key],
				_.get(state.cohortSamples, 'length', 0),
				state.index[key]]),
		_.apply(widgets.avg));

var matchSelector = createSelector(
	state => state.sampleSearch,
	state => state.columns,
	state => state.columnOrder,
	state => state.data,
	state => state.cohortSamples,
	searchSamples);

var mergeKeys = (a, b) => _.mapObject(a, (v, k) => _.merge(v, b[k]));

var kmSelector = createSelector(
		state => state.samples,
		state => _.getIn(state, ['columns', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['data', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['index', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['km', 'cutoff']),
		state => _.getIn(state, ['km', 'splits']),
		state => state.survival,
		(samples, column, data, index, cutoff, splits, survival) =>
			column && survival && km.makeGroups(column, data, index, cutoff, splits, survival, samples));

// Enforce default width in wizardMode
var ammedWidthSelector = createFmapSelector(
		({columns, wizardMode, defaultWidth}) =>
			_.fmap(columns, column => ({column, wizardMode, defaultWidth})),
		({column, wizardMode, defaultWidth}) => wizardMode ?
			_.assoc(column, 'width', defaultWidth) : column);

var index = state => ({...state, index: indexSelector(state)});
var avg = state => ({...state, data: mergeKeys(state.data, avgSelector(state))});
var match = state => ({...state, samplesMatched: matchSelector(state)});
var sort = state => ({...state, samples: sortSelector(state)});
var transform = state => ({...state, columns: mergeKeys(state.columns, transformSelector(state))});
var ammedWidth = state => ({...state, columns: ammedWidthSelector(state)});
var setPublic = state => ({...state, isPublic: isPublicSelector(state)});

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

var selector = state => kmGroups(transform(sort(match(avg(index(ammedWidth(setPublic(state))))))));

module.exports = selector;
