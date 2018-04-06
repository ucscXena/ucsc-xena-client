'use strict';
/*global describe: false, it: false, cy: false, beforeEach: false, expect: false, Cypress: false, before: false, after: false */

var {zipObject, map} = Cypress._;
var {setupPlayback} = require('./xhrPlayRecord');

var pages = {
	spreadsheet: require('../pages/heatmap'),
	transcripts: require('../pages/transcripts'),
	hub: {url: '/hub/'},
	datapages: {url: '/datapages/'}
};

var {nav, wizard} = pages.spreadsheet;

function clearSessionStorage() {
	window.sessionStorage.clear();
}

function disableHelp() {
	window.localStorage.xenaNotifications = '{"rowHelp":true,"columnHelp":true,"zoomHelp":true}';
}

// run a set of side effects
var exec = (...fns) => () => fns.forEach(fn => fn());

// XXX duplicated in heatmap_spec, others
var aTCGAStudy = 'TCGA Lung Adenocarcinoma';
var aGTEXStudy = 'GTEX Lung';

var commands = [
	{
		type: 'new-tab',
		run: ({page}) =>  cy.visit(pages[page].url,
		                           {onBeforeLoad: exec(clearSessionStorage, disableHelp)})
	},
	{
		type: 'select-cohort',
		run: ({cohort}) => {
			wizard.cohortInput().type(cohort.slice(0, 10));
			wizard.cohortSelect(cohort);
			wizard.cohortDone().click();
		}
	},
	{
		type: 'select-datasets',
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
		run: ({page}) => {
			nav[page]().click();
			nav.waitForTransition();
			// XXX assert page has loaded?
		}
	},
	{
		type: 'transcripts-select-gene',
		run: ({gene}) => {
			pages.transcripts.studyA().select(aTCGAStudy);
			pages.transcripts.studyB().select(aGTEXStudy);
			pages.transcripts.loadingSpinners().should('not.exist');
			pages.transcripts.geneFieldInput().clear().type(gene);
			pages.transcripts.updateGene().click();
			pages.transcripts.loadingSpinners().should('not.exist');
		}
	},
	{
		type: 'reload',
		run: ({page}) => cy.visit(pages[page].url)
	},
	{
		type: 'cancel-cohort',
		run: () => pages.spreadsheet.spreadsheet.closeCohort().click()
	},
	{
		type: 'reset-cohort',
		run: () =>  pages.spreadsheet.spreadsheet.resetCohort().click()
	}
];

function readSequence() {
	return cy.readFile(Cypress.env('SEQUENCE_FILE'));
}

// need to handle empty list?
function runSequence(seq) {
	var cmdIdx = zipObject(map(commands, 'type'), commands);
	// XXX should make assertions on state, here. cypress is doing
	// a lot of assertions as part of the run() methods.
	seq.forEach(step => {
		cmdIdx[step.cmd.type].run(step.cmd);
	});
	// Cypress requires creating a promise here. If we
	// return the Cypress command, it will resolve to undefined.
	var done;
	var p = new Cypress.Promise(resolve => {done = resolve;});

	cy.wrap(true).then(() => done(true)); // sync cypress with the promise
	return p; // return a promise so jsc will wait on it.
//	return cy.wrap().then(() => true);
}

describe('Sequence runner', function() {
	setupPlayback();
	it('should run sequence', function() {
		readSequence().then(seq => {
			// If we do then(runSequence), cypress fails. This is really
			// weird.
			runSequence(seq);
		});
	});
});
