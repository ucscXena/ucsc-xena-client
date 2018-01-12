'use strict';
/*global cy: false, Cypress: false */
var jsc = require('jsverify');
var _ = require('lodash');
var cmdSequence = require('./state-generator');
var {zipObject, map} = _;
var pages = {
	spreadsheet: require('../pages/heatmap'),
	transcripts: require('../pages/transcripts'),
	hub: {url: '/hub/'},
	datapages: {url: '/datapages/'}
};

var {nav, wizard} = pages.spreadsheet;

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
var aTCGAStudy = 'TCGA Lung Adenocarcinoma';
var aGTEXStudy = 'GTEX Lung';

function clearSessionStorage() {
	window.sessionStorage.clear();
}

function disableHelp() {
	window.localStorage.xenaNotifications = '{"rowHelp":true,"columnHelp":true,"zoomHelp":true}';
}

// run a set of side effects
var exec = (...fns) => () => fns.forEach(fn => fn());
///////////////////////

var commands = [
	{
		type: 'new-tab',
		canCreate: () => true, // later change to filter out 'noop' commands
		apply: (state, {page}) => ({page, 'spreadsheet': 'wizard1',
		                            transcripts: undefined}),
		generate: () => record({type: constant('new-tab'), page: pageArb}),
		canApply: () => true,
		run: ({page}) =>  cy.visit(pages[page].url,
		                           {onBeforeLoad: exec(clearSessionStorage, disableHelp)})
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
		                                   spreadsheet === 'wizard1',
		run: ({cohort}) => {
			wizard.cohortInput().type(cohort.slice(0, 10));
			wizard.cohortSelect(cohort);
			wizard.cohortDone().click();
		}
	},
	{
		type: 'select-datasets',
		priority: 15,
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                    spreadsheet === 'wizard2',
		apply: state => merge(state, {'spreadsheet': 'heatmap'}),
		generate: () => constant({type: 'select-datasets'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'wizard2',
		run: () => {
			wizard.geneExpression().click();
			wizard.somaticMutation().click();
			wizard.copyNumber().click();
			wizard.geneFieldInput().type('TP53');
			wizard.columnDone().click();
		}
	},
	{
		type: 'nav',
		canCreate: hasPage,
		apply: (state, {page}) => merge(state, {page}),
		generate: () => record({type: constant('nav'), page: pageArb}),
		canApply: hasPage,
		run: ({page}) => {
			nav[page]().click();
			nav.waitForTransition();
			// XXX assert page has loaded?
		}
	},
	{
		type: 'transcripts-select-gene',
		priority: 4,
		canCreate: ({page}) => page === 'transcripts',
		apply: (state, {gene}) => merge(state, {'transcripts': gene}),
		generate: () => constant({type: 'transcripts-select-gene', gene: 'KRAS'}), // later change to be variable?
		canApply: ({page}) => page === 'transcripts',
		run: ({gene}) => {
			pages.transcripts.studyA().select(aTCGAStudy);
			pages.transcripts.studyB().select(aGTEXStudy);
			pages.transcripts.geneFieldInput().clear().type(gene);
			pages.transcripts.updateGene().click();
			pages.transcripts.geneIsLoaded();
		}
	},
	{
		type: 'reload',
		canCreate: hasPage,
		apply: state => state,
		generate: ({page}) => constant({type: 'reload', page}),
		canApply: hasPage,
		run: ({page}) => cy.visit(pages[page].url)
	},
	{
		type: 'cancel-cohort',
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                    spreadsheet === 'wizard2',
		apply: state => merge(state, {'spreadsheet': 'wizard1'}),
		generate: () => constant({type: 'cancel-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'wizard2',
		run: () => pages.spreadsheet.spreadsheet.closeCohort().click()
	},
	{
		type: 'reset-cohort',
		canCreate: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'heatmap',
		apply: state => merge(state, {'spreadsheet': 'wizard1'}),
		generate: () => constant({type: 'reset-cohort'}),
		canApply: ({page, spreadsheet}) => page === 'spreadsheet' &&
		                                   spreadsheet === 'heatmap',
		run: () =>  pages.spreadsheet.spreadsheet.resetCohort().click()
	}
];


var seqCount = 0;
function runSequence(seq) {
	console.log('run seq', seq, seqCount++);
	var cmdIdx = zipObject(map(commands, 'type'), commands);
	// XXX should make assertions on state, here. cypress is doing
	// a lot of assertions as part of the run() methods.

	// XXX The run() steps are async. We have to
	//  return a promise so jsc will wait on it.
	cy.softerror();
	seq.forEach(step => {
		cmdIdx[step.cmd.type].run(step.cmd);
	});
	// Cypress requires creating a promise here. If we
	// return the Cypress command, it will resolve to undefined.
	var done;
	var p = new Cypress.Promise(resolve => {done = resolve;});
	cy.recover().then(err => done(!err)); // sync cypress with the promise, and set status
	return p; // return a promise so jsc will wait on it.
//	return cy.wrap().then(() => true);
}

// testing

//function matchSubseq(pat, list) {
//	var i = list.indexOf(pat[0]);
//	if (i === -1) {
//		return false;
//	}
//	if (isEqual(pat, list.slice(i, i + pat.length))) {
//		return true;
//	}
//	return matchSubseq(pat, list.slice(i + 1));
//}
//
//var prop = jsc.forall(cmdSequence(initialState, commands),
//					  seq => !matchSubseq(['nav', 'nav', 'select-cohort'], map(seq, c => c.cmd.type)));
//
//console.log(jsc.check(prop));

var property = jsc.forall(cmdSequence(initialState, commands), runSequence);

module.exports = {
	commands,
	runSequence,
	property,
	openpage: () => cy.visit('/heatmap/')
};
