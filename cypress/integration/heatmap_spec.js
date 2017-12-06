'use strict';
/*global describe: false, it: false, cy: false, beforeEach: false */

var heatmapPage = require('../pages/heatmap');
var {wizard, spreadsheet} = heatmapPage;
var transcriptPage = require('../pages/transcripts');

var aCohort = 'TCGA Breast Cancer (BRCA)';
var aTCGAStudy = 'TCGA Lung Adenocarcinoma';
var aGTEXStudy = 'GTEX Lung';
//function spy(msg, x) {
//	console.log(msg, x);
//	return x;
//}
// Notes
// cypress proxy is introducing long delays when checking for a local hub.
// This can be avoided by 1) going to hub page in the cypress browser, 2)
// disabling localhost, 3) reloading, to force save of sessionStorage.
//
// A test run starts by destroying the current app frame, which prevents
// beforeunload handlers from running.
//
// Unclear how hot-loading should work in this context. Do we want the dev
// stuff to be active?
//
// Initial problems: 1) ajax mucked up, 2) filter( contains() ) not working,
// 3) no tab API, makes it hard to test bookmarks in a new tab
//
// sessionStorage
// 	  It is convenient right now, because it allows disabling the local hub.
// 	  To test a "new tab", we have to explicitly reset tab state: zero sessionStorage;
// 	     and what about history? Does it matter? Or window.opener?
//
// localStorage
// 	  Can we avoid clearing localStorage? Otherwise we will always get the pop-ups.
// 	  Or perhaps, instead, we should explicity turn them off. That may work
// 	  in local test, because the domains are the same, but might fail testing
// 	  against dev, since they are different (cypress served locally, dev on
// 	  aws).
// 	  Nope, it still works. Weird.
// 	  To test localStorage, I think we have to nav to a page, set localStorage,
// 	  nav to a page again, and verify the result.
//
//	localStorage.xenaNotifications = "{"rowHelp":true,"columnHelp":true}";


function clearSessionStorage() {
	window.sessionStorage.clear();
}

describe('Viz page', function() {
	it('Renders a spreadsheet', function() {
		cy.visit(heatmapPage.url, {onBeforeLoad: clearSessionStorage});

		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSelect(aCohort);
		cy.contains('Done').click();

		wizard.geneExpression().click();
		wizard.somaticMutation().click();
		wizard.copyNumber().click();
		wizard.geneFieldInput().type('TP53');
		cy.contains('Done').click();

		cy.contains('GOT IT').click();
		cy.contains('GOT IT').click();
	});
	it('Renders a chart', function() {
		cy.visit(heatmapPage.url, {onBeforeLoad: clearSessionStorage});

		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSelect(aCohort);
		cy.contains('Done').click();

		wizard.geneExpression().click();
		wizard.somaticMutation().click();
		wizard.copyNumber().click();
		wizard.geneFieldInput().type('TP53');
		cy.contains('Done').click();

		cy.contains('GOT IT').click();
		cy.contains('GOT IT').click();

		spreadsheet.chartView().click();
	});
});

// XXX move to different file
describe('Transcript page', function() {
	it('Loads', function() {
		cy.visit(transcriptPage.url, {onBeforeLoad: clearSessionStorage});
		transcriptPage.studyA().select(aTCGAStudy);
		transcriptPage.studyB().select(aGTEXStudy);
		transcriptPage.geneFieldInput().type('KRAS');
		transcriptPage.updateGene().click();
	});
});
