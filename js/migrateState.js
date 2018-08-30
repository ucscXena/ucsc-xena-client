'use strict';

// Desired behavior:
// When we change the state structure, add a migration.
// Sources of state:
//   sessionStorage
//   bookmarks
//   initial state
//
//

var version = 1;

var {assoc, flatten, get, getIn, isString, Let, omit, pick, updateIn, without} = require('./underscore_ext');

var setVersion = state => assoc(state, 'version', version);
var getVersion = state =>
	Let((s = get(state, 'version', 0)) => isString(s) ? 0 : s);

var noComposite = state => assoc(state,
		'cohort', state.cohort[0],
		'cohortSamples', state.cohortSamples[0]);

var spreadsheetProps = ['columnOrder', 'columns', 'mode', 'notifications', 'servers', 'showWelcome', 'wizardMode', 'zoom', 'defaultWidth', 'data', 'cohort', 'cohortSamples', 'km', 'survival', 'sampleSearch', 'samplesOver', 'editing', 'openVizSettings', 'chartState', 'hasPrivateSamples'];
//var dropProps = ['cohortMeta', 'cohortPreferred', 'cohortPhenotype', 'cohorts', 'datasets', 'features', 'samples', 'columnEdit'];

var splitPages = state => {
//	console.log('Unhandled state', pick(state, (v, k) => !contains(spreadsheetProps, k) && !contains(dropProps, k)));
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

// This must be sorted, with later versions appearing last.
var migrations = [
	[noComposite, splitPages, samplesToLeft]
];

// treehouse is down & mucking up bookmarks
var omitTreehouse = state =>
	updateIn(state, ['spreadsheet', 'servers'],
			servers => omit(servers, 'https://xena.treehouse.gi.ucsc.edu', 'https://xena.treehouse.gi.ucsc.edu:443'));

function apply(state) {
	var v = getVersion(state),
		toDo = flatten(migrations.slice(v));

	return omitTreehouse(setVersion(toDo.reduce((prev, fn) => fn(prev), state)));
}

module.exports = apply;
