/*global require: false */
'use strict';
var jsc = require('jsverify');

var cmdSequence = require('./state-generator');

var {record, oneof, constant} = jsc;

var merge = (...args) => Object.assign({}, ...args);

var initialState = {
	page: undefined,
	spreadsheet: 'wizard1',
	transcripts: undefined
};

var hasPage = ({page}) => page != null;

var pageArb = oneof(['spreadsheet', 'hub', 'transcripts', 'datapages'].map(constant));

///////////////////////
// These are duplicated in heatmap_spec
var aCohort = 'TCGA Breast Cancer (BRCA)';

var commands = [
	{
		type: 'new-tab',
		canCreate: () => true, // later change to filter out 'noop' commands
		apply: (state, {page}) => ({page, 'spreadsheet': 'wizard1',
		                            transcripts: undefined}),
		generate: () => record({type: constant('new-tab'), page: pageArb}),
		canApply: () => true
	},
	{
		type: 'select-cohort',
		priority: 15,
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                    spreadsheet === 'wizard1',
		apply: state => merge(state, {'spreadsheet': 'wizard2'}),
		// extend cohort list later
		generate: () => record({type: constant('select-cohort'),
		                        cohort: oneof([constant(aCohort)])}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'wizard1'
	},
	{
		type: 'select-datasets',
		priority: 15,
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                    spreadsheet === 'wizard2',
		apply: state => merge(state, {'spreadsheet': 'heatmap'}),
		generate: () => constant({type: 'select-datasets'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'wizard2'
	},
	{
		type: 'nav',
		canCreate: hasPage,
		apply: (state, {page}) => merge(state, {page}),
		generate: () => record({type: constant('nav'), page: pageArb}),
		canApply: hasPage
	},
	{
		type: 'transcripts-select-gene',
		priority: 4,
		canCreate: ({page}) => page === 'transcripts',
		apply: (state, {gene}) => merge(state, {'transcripts': gene}),
		generate: () => record({type: constant('transcripts-select-gene'),
		                        gene: oneof(['KRAS', 'TP53', 'PTEN', 'FOXM1']
		                              .map(constant))}),
		canApply: ({page}) => page === 'transcripts'
	},
	{
		type: 'reload',
		canCreate: hasPage,
		apply: state => state,
		generate: ({page}) => constant({type: 'reload', page}),
		canApply: hasPage
	},
	{
		type: 'cancel-cohort',
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                    spreadsheet === 'wizard2',
		apply: state => merge(state, {'spreadsheet': 'wizard1'}),
		generate: () => constant({type: 'cancel-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'wizard2'
	},
	{
		type: 'reset-cohort',
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'heatmap',
		apply: state => merge(state, {'spreadsheet': 'wizard1'}),
		generate: () => constant({type: 'reset-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'heatmap'
	}
];

var generator = cmdSequence(initialState, commands);

module.exports = {
	initialState,
	commands,
	generator
};
