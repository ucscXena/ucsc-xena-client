
// Desired behavior:
// When we change the state structure, add a migration.
// Sources of state:
//   sessionStorage
//   bookmarks
//   initial state
//
//

var version = 4; // XXX duplicated in store.js?

var {assoc, flatten, get, getIn, Let, mapObject, merge, omit, pick, isString,
	updateIn, without} = require('./underscore_ext').default;
var {servers: {localHub, oldLocalHub}} = require('./defaultServers');

var setVersion = state => assoc(state, 'version', version);
var getVersion = state =>
	Let((s = get(state, 'version', 0)) => isString(s) ? 0 : s);

var noComposite = state => assoc(state,
		'cohort', state.cohort[0],
		'cohortSamples', state.cohortSamples[0]);

var spreadsheetProps = ['columnOrder', 'columns', 'mode', 'notifications', 'servers', 'showWelcome', 'wizardMode', 'zoom', 'defaultWidth', 'data', 'cohort', 'cohortSamples', 'km', 'survival', 'sampleSearch', 'samplesOver', 'editing', 'openVizSettings', 'chartState', 'hasPrivateSamples'];

var splitPages = state => {
	return {
		spreadsheet: pick(state, spreadsheetProps),
		page: 'heatmap'
	};
};

// This will break bookmarks with sample search and samples to the right
var samplesToLeft = state =>
	// We don't want to create a blank spreadsheet object if there is none, so check
	// if there's a columnOrder before doing anything. indexOf could be -1 or 0
	getIn(state, ['spreadsheet', 'columnOrder'], []).indexOf('samples') > 0 ?
		updateIn(state, ['spreadsheet', 'columnOrder'], order => ['samples', ...without(order, 'samples')]) :
		state;

var noFieldSpec = state =>
	get(state, 'spreadsheet') ?
	updateIn(state, ['spreadsheet', 'columns'], columns =>
			mapObject(columns, column => merge(omit(column, 'fieldSpecs'), getIn(column, ['fieldSpecs', 0], {})))) :
	state;

var noLocalCert = state =>
	getIn(state, ['spreadsheet', 'servers', oldLocalHub]) ?
		updateIn(state, ['spreadsheet', 'servers'], servers =>
			assoc(omit(servers, oldLocalHub), localHub, servers[oldLocalHub])) :
		state;

// chart mode. Tracking exp separately for x and y doesn't make sense. To
// avoid breaking existing views, prefer the exp setting for current x and y,
// from either setting. This will affect "a vs. a" charts with different exp
// setting, but they're not worth preserving.
var noExpX = state =>
	get(state, 'spreadsheet') ?
		updateIn(state, ['spreadsheet', 'chartState'], chartState => {
			if (chartState) {
				var {expState, expXState, xcolumn, ycolumn} = chartState;
				chartState = omit(chartState, 'expXState');
				return assoc(chartState, 'expState',
					merge(expXState, expState,
						pick(expXState, xcolumn),
						pick(expState, ycolumn)));
			}
		}) :
	state;

// This must be sorted, with later versions appearing last.
var migrations = [
	[noComposite, splitPages, samplesToLeft], // to v1
	[noFieldSpec],                            // to v2
	[noLocalCert],                            // to v3
	[noExpX]                                  // to v4
];

function apply(state) {
	var v = getVersion(state),
		toDo = flatten(migrations.slice(v));

	return setVersion(toDo.reduce((prev, fn) => fn(prev), state));
}

module.exports = apply;
