'use strict';
var jsc = require('jsverify');
var _ = require('lodash');
var cmdSequence = require('./state-generator');
var {isEqual, includes, map} = _;

var {record, oneof, constant} = jsc;

var merge = (...args) => Object.assign({}, ...args);

var initialState = {
	page: undefined,
	spreadsheet: 'wizard1',
	transcripts: undefined
};

var hasPage = ({page}) => page != null;

var pageArb = oneof(['spreadsheet', 'hub', 'transcripts', 'datapages'].map(constant));

var commands = [
	{
		type: 'new-tab',
		canCreate: () => true, // later change to filter out 'noop' commands
		apply: (state, {page}) => ({page, 'spreadsheet': 'wizard1', transcripts: undefined}),
		generate: () => record({type: constant('new-tab'), page: pageArb}),
		canApply: () => true,
	},
	{
		type: 'select-cohort',
		priority: 10,
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' && spreadsheet === 'wizard1',
		apply: state => merge(state, {'spreadsheet': 'wizard2'}),
		generate: () => constant({type: 'select-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' && spreadsheet === 'wizard1'
	},
	{
		type: 'select-datasets',
		priority: 10,
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' && spreadsheet === 'wizard2',
		apply: state => merge(state, {'spreadsheet': 'heatmap'}),
		generate: () => constant({type: 'select-datasets'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' && spreadsheet === 'wizard2'
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
		priority: 7,
		canCreate: ({page}) => page === 'transcripts',
		apply: (state, {gene}) => merge(state, {'transcripts': gene}),
		generate: () => constant({type: 'transcripts-select-gene', gene: 'FOXM1'}), // later change to be variable?
		canApply: ({page}) => page === 'transcripts'
	},
	{
		type: 'reload',
		canCreate: hasPage,
		apply: state => state,
		generate: () => constant({type: 'reload'}),
		canApply: hasPage
	},
	{
		type: 'reset-cohort',
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' && includes(['wizard2', 'heatmap'], spreadsheet),
		apply: state => merge(state, {'spreadsheet': 'wizard1'}),
		generate: () => constant({type: 'reset-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' && includes(['wizard2', 'heatmap'], spreadsheet)
	}
];

// testing

function matchSubseq(pat, list) {
	var i = list.indexOf(pat[0]);
	if (i === -1) {
		return false;
	}
	if (isEqual(pat, list.slice(i, i + pat.length))) {
		return true;
	}
	return matchSubseq(pat, list.slice(i + 1));
}

var prop = jsc.forall(cmdSequence(initialState, commands),
					  seq => !matchSubseq(['nav', 'nav', 'select-cohort'], map(seq, c => c.cmd.type)));

console.log(jsc.check(prop));
