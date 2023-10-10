
var _ = require('./underscore_ext').default;
var {createSelectorCreator, defaultMemoize} = require('reselect');
var {createFmapSelector} = require('./selectors');
var widgets = require('./columnWidgets');
var km = require('./models/km');
var {searchSamples} = require('./models/searchSamples');
var isPublicSelector = require('./isPublicSelector');
// XXX should move userServers, or maybe put it in a selector
var {userServers} = require('./controllers/common');
var {fradixSortL16$64} = require('./xenaWasm');
import {defaultWidth} from './controllers/ui';

var minWidth = defaultWidth(0);

var createSelector = createSelectorCreator(defaultMemoize, _.isEqual);

var indexSelector = createFmapSelector(
		state => _.fmap(state.columns,
			(column, key) => [
				_.getIn(column, ['fieldType']),
				state.data[key]]),
		args => widgets.index(...args));

// XXX can we have an implicit index list in the sort
// entry? I.e. on first pass inject the index instead of
// doing a lookup?
var indiciesSelector = _.memoize1(n => {
	var out = new Uint32Array(n);
	for (var i = 0; i < n; ++i) {
		out[i] = i;
	}
	return out;
});

// XXX Doesn't handle sparse data, or sort direction.
var sortSubSelector = _.memoize1(
	(length, columns, data) => {
		var sorted;
		var indicies = indiciesSelector(length);
		var d = _.flatmap(data, d => _.getIn(d, ['req', 'values']))
			.filter(x => x.length);
		var dir = _.pluck(columns, 'sortDirection');

		sorted = fradixSortL16$64(d, dir, indicies);
		return sorted || indicies;
});

var sortSelector = createSelector(
	state => state.cohortSamples,
	state => _.fmap(state.columns, c => _.pick(c, 'fieldType', 'fields', 'xzoom', 'sortVisible', 'sortDirection')),
	state => state.columnOrder,
	state => state.data,
	state => state.index,
	(cohortSamples, columns, columnOrder, data/*, index*/) => {
		var length = (cohortSamples || []).length,
			order = columnOrder.slice(1).filter(id => _.getIn(data, [id, 'req'])),
			icolumns = order.map(id => columns[id]),
			idata = order.map(id => data[id]);
			// XXX Previously used for sparse data.
			// How to handle this if sort depends on zoom?
			//iindex = order.map(id => index[id]);
		return sortSubSelector(length, icolumns, idata);
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
				_.pick(column, 'fieldType', 'fields', 'xzoom'),
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
		state => state.cohortSamples,
		state => _.getIn(state, ['columns', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['data', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['index', _.getIn(state, ['km', 'id'])]),
		state => _.getIn(state, ['km', 'cutoff']),
		state => _.getIn(state, ['km', 'splits']),
		state => _.getIn(state, ['km', 'survivalType']),
		state => state.survival,
		(samples, cohortSamples, column, data, index, cutoff, splits, survivalType, survival) =>
			column && survival && km.makeGroups(column, data, index, cutoff, splits, survivalType, survival, samples, cohortSamples));

// Enforce default width in wizardMode
var ammedWidthSelector = createFmapSelector(
		({columns, wizardMode, defaultWidth = minWidth}) =>
			_.fmap(columns, column => ({column, wizardMode, defaultWidth})),
		({column, wizardMode, defaultWidth}) => wizardMode ?
			_.assoc(column, 'width', defaultWidth) : column);

var index = state => ({...state, index: indexSelector(state)});
var avg = state => ({...state, data: mergeKeys(state.data, avgSelector(state))});
var match = state => _.Let((m = matchSelector(state), hl = state.highlightSelect) =>
			({
				...state,
				samplesMatched: !m.matches ? null :
					hl == null ? _.last(m.matches) :
					m.matches[hl],
				allMatches: m}));
var sort = state => ({...state, samples: sortSelector(state)});
var transform = state => ({...state, columns: mergeKeys(state.columns, transformSelector(state))});
var ammedWidth = state => ({...state, columns: ammedWidthSelector(state)});
var setPublic = state => ({...state, isPublic: isPublicSelector(state)});

// kmGroups transform calculates the km data, and merges it into the state.km object.

var kmGroups = state => ({...state, km: { ...state.km, groups: kmSelector(state)}});

var spreadsheetSelector = selector =>
		state => _.updateIn(state, ['spreadsheet'], selector);

//

var supportsTies = state => _.getIn(state, ['cohort', 'name'], '').indexOf('TCGA') === 0;

var tiesSelector = state =>
	_.assoc(state, 'tiesEnabled', supportsTies(state));

var pickUserServers = (obj, servers) => _.pick(obj, userServers({servers}));

var cohortsSelector = createSelector(
		state => state.wizard.serverCohorts,
		state => state.spreadsheet.servers,
		(serverCohorts, servers) =>
			_.uniq(_.flatten(_.values(pickUserServers(serverCohorts, servers)))));

var indexBy = (key, list) => _.object(_.pluck(list, key), list);

var datasetsSelector = createSelector(
		state => _.get(state.wizard.cohortDatasets,
					_.get(state.spreadsheet.cohort, 'name'), {}),
		state => state.spreadsheet.servers,
		(cohortDatasets, servers) =>
			indexBy('dsID',
				_.flatten(_.values(pickUserServers(cohortDatasets, servers)))));

// XXX should try to deprecate this & use cohortFeatures
var featuresByDsID = cohortFeatures =>
	_.object(_.flatmap(cohortFeatures, (datasets, host) =>
		_.map(datasets, (features, dataset) =>
			[JSON.stringify({host, name: dataset}), features])));

var featuresSelector = createSelector(
		state => _.get(state.wizard.cohortFeatures,
					_.get(state.spreadsheet.cohort, 'name'), {}),
		state => state.spreadsheet.servers,
		(cohortFeatures, servers) =>
			featuresByDsID(pickUserServers(cohortFeatures, servers)));

var setWizardProps = selector => state =>
	selector(_.updateIn(state, ['wizard'], wizard =>
				_.merge(wizard, {
					cohorts: cohortsSelector(state),
					datasets: datasetsSelector(state),
					features: featuresSelector(state)
				})));

///////
// This is the main transform ('selector') of the application state, before passing to the view.
// We build indexes of the column data, sort samples by the column data, transform
// the data for display (e.g. map to colors), and calculate km if a km plot is requested.
//
// The result of the transforms is a state object with the calculated values merged.
// The transforms are memoized for performance.

var selector = state => tiesSelector(kmGroups(transform(sort(match(avg(index(ammedWidth(setPublic(state)))))))));


// This seems odd. Surely there's a better test?
var hasSurvival = survival =>
	!!(_.some(_.values(km.survivalOptions),
		option => _.get(survival, option.ev) && _.get(survival, option.tte)) && _.get(survival, 'patient'));

var survivalSelector = createSelector(
	state => state.wizard.cohortFeatures,
	state => state.spreadsheet.cohort,
	state => state.spreadsheet.km,
	(cohortFeatures, cohort, user) =>
		cohort && cohortFeatures &&
			hasSurvival(km.pickSurvivalVars(cohortFeatures[cohort.name], user)));

var setSurvival = selector => state => selector(_.assocIn(state, ['spreadsheet', 'hasSurvival'], survivalSelector(state)));

export default setWizardProps(setSurvival(spreadsheetSelector(selector)));
