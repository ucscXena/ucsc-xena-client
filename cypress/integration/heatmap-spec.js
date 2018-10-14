'use strict';
/*global describe: false, it: false, cy: false, beforeEach: false, expect: false, Cypress: false, before: false, after: false */

var heatmapPage = require('../pages/heatmap');
var transcriptPage = require('../pages/transcripts');
var datapagesPage = require('../pages/datapages');
var hubPage = require('../pages/hub');

var {nav, wizard, spreadsheet} = heatmapPage;

var {setupPlayback, shimResponse} = require('./xhrPlayRecord');

var aCohort = 'TCGA Breast Cancer (BRCA)';
var aTCGAStudy = 'TCGA Lung Adenocarcinoma';
var aGTEXStudy = 'GTEX Lung';

function spy(msg, x) { //eslint-disable-line no-unused-vars
	console.log(msg, x);
	return x;
}

function clearSessionStorage() {
	window.sessionStorage.clear();
}

function disableHelp() {
	window.localStorage.xenaNotifications = '{"rowHelp":true,"columnHelp":true,"zoomHelp":true}';
}

// run a set of side effects
var exec = (...fns) => () => fns.forEach(fn => fn());

function renderASpreadsheet(load = true) {
	if (load) {
		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
	}

	wizard.cohortInput().type(aCohort.slice(0, 10));
	wizard.cohortSelect(aCohort);
	wizard.cohortDone().click();

	wizard.geneExpression().click();
	wizard.somaticMutation().click();
	wizard.copyNumber().click();
	wizard.geneFieldInput().type('TP53');
	wizard.columnDone().click();
	spreadsheet.loadingSpinners().should('not.be.visible');

//	cy.contains('GOT IT').click();
//	cy.contains('GOT IT').click();
}

describe('Viz page', function() {
	setupPlayback();
	it('Renders spreadsheet heatmap and chart', function() {
		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		renderASpreadsheet(false);
		spreadsheet.chartView().click();
		spreadsheet.chart();
		spreadsheet.heatmapView().click();
		spreadsheet.kaplanMeierButton(1).click({force: true});
		spreadsheet.kaplanMeier();
	});
});

function renderATranscript() {
	cy.visit(transcriptPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
	transcriptPage.studyA().select(aTCGAStudy);
	transcriptPage.studyB().select(aGTEXStudy);
	transcriptPage.geneFieldInput().type('KRAS');
	transcriptPage.updateGene().click();
	// cypress doesn't seem to have a way to wait on unspecified ajax
	// requests to complete, or to ignore canceled requests. So, if we
	// don't wait on something else here, we'll get an error in the *next*
	// test when the transcript expression request aborts.
	transcriptPage.loadingSpinners().should('not.exist');
	cy.wait(transcriptPage.loadTransition);
}

// XXX move to different file, or revisit the name of this file.
describe('Transcript page', function() {
	setupPlayback();
	it('Draws', renderATranscript);
});

describe('Datapages', function () {
	setupPlayback();
	it('loads', function() {
		cy.visit(datapagesPage.url,
		         {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		datapagesPage.cohortList().should('exist');
		datapagesPage.cohortSelect(aCohort);
	});
});

describe('Hub page', function () {
	setupPlayback();
	it('loads', function () {
		cy.visit(hubPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		hubPage.hubList().should('exist');
	});
	it('updates cohorts', function () {
		cy.visit(hubPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		hubPage.hubItem(hubPage.hubs.tcga).click();
		nav.spreadsheet().click(); // via nav link
		nav.waitForTransition();
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSuggestItems().should('exist')
			.then(items => items.toArray().map(e => e.innerText))
			.should('not.contain', aCohort);
		nav.hub().click();         // via nav link
		nav.waitForTransition();
		hubPage.hubItem(hubPage.hubs.tcga).click();
		nav.spreadsheet().click(); // via nav link
		nav.waitForTransition();
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSuggestItems().should('exist')
			.then(items => items.toArray().map(e => e.innerText))
			.should('contain', aCohort);

		cy.visit(hubPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		hubPage.hubItem(hubPage.hubs.tcga).click();
		cy.visit(heatmapPage.url); // via page load
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSuggestItems().should('exist')
			.then(items => items.toArray().map(e => e.innerText))
			.should('not.contain', aCohort);
		cy.visit(hubPage.url);     // via page load
		hubPage.hubItem(hubPage.hubs.tcga).click();
		cy.visit(heatmapPage.url); // via page load
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSuggestItems().should('exist')
			.then(items => items.toArray().map(e => e.innerText))
			.should('contain', aCohort);
	});
});

var replayBookmark = xhr => {
	var response = decodeURIComponent(xhr.request.body.slice("content=".length));
	cy.route({
		url: '/api/bookmarks/bookmark*',
		method: 'GET',
		onRequest: shimResponse(Promise.resolve({response, status: 200})),
		response: 'placeholder',
	}).as('readBookmark');
};

var screenshot = file => {
	cy.wait(200);

	// XXX disable responsive layout during screeshot
	cy.window().then(w => w.cypressScreenshot = true);
	cy.screenshot(file);
	return cy.window().then(w => w.cypressScreenshot = false); // XXX move this to common pre-method or post-method, so it runs even if we crash
};

function compareScreenshots(a, b) {
	cy.exec(`babel-node cypress/compareImages.js heatmap-spec.js ${a} ${b}`).then(result => {
		expect(result.stdout, `differ: ${a}.png ${b}.png ${a}-${b}-diff.png`).to.contain('same');
	});
}

// XXX would like to cover this in a generative test.
describe('Datapages circuit', function () {
	setupPlayback();
	it('retains heatmap view if cohort unchanged', function () {

		renderASpreadsheet(true);
		cy.scrollTo('topLeft');
		screenshot('heatmap');

		cy.visit(datapagesPage.url);
		datapagesPage.cohortSelect(aCohort);
		datapagesPage.cohortVisualize().click();

		nav.waitForTransition(); // nav button animation
		cy.scrollTo('topLeft');
		screenshot('heatmapAgain');
		compareScreenshots('heatmap', 'heatmapAgain');
	});
});

var query = url => url.split(/\?/)[1];
var highchartAnimation = 2000; // XXX move to page object
var bootstrapAnimation = 2000;
describe('Bookmark', function() {
	setupPlayback();
	it('Saves and restores heatmap and chart', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		///////////////////////////////////////
		// Bookmark a spreadsheet
		//

		renderASpreadsheet();

		cy.scrollTo('topLeft');
		screenshot('heatmap');

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(heatmapPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		spreadsheet.loadingSpinners().should('not.be.visible');
		cy.scrollTo('topLeft');
		screenshot('heatmapBookmark');

		//
		// Assert that the bookmark image matches the original heatmap
		//

		compareScreenshots('heatmap', 'heatmapBookmark');

		///////////////////////////////////////
		// Bookmark KM
		//

		cy.scrollTo('topLeft');

		// XXX Coerce a re-render, which is necessary if we haven't rendered
		// the column since the features were fetched. This is because we
		// only compute disableKM on render. If we don't re-render, the KM button
		// will be disabled, becase we rendered before 'features' were fetched.
		// Should move disableKM to a selector.
		spreadsheet.colCanvas(1).click({force: true}); // zoom to re-render

		spreadsheet.kaplanMeierButton(1).click({force: true});
		cy.wait(bootstrapAnimation);
		spreadsheet.kaplanMeier();
		cy.scrollTo('topLeft');
		screenshot('kaplanMeier');

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(heatmapPage.url + '?bookmark=a1b2', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=a1b2'));
		spreadsheet.loadingSpinners().should('not.be.visible');
		cy.scrollTo('topLeft');
		cy.wait(bootstrapAnimation);
		screenshot('kaplanMeierBookmark');

		//
		// Assert that the bookmark image matches the original KM
		//

		compareScreenshots('kaplanMeier', 'kaplanMeierBookmark');

		spreadsheet.kaplanMeierClose().click();

		///////////////////////////////////////
		// Bokmark chart mode
		//

		spreadsheet.chartView().click();

		// XXX move to page object
		cy.get('.highcharts-root').wait(highchartAnimation);
		cy.scrollTo('topLeft');
		screenshot('chart');

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(heatmapPage.url + '?bookmark=abcd', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=abcd'));
		// XXX move to page object
		cy.get('.highcharts-root').wait(highchartAnimation);
		cy.scrollTo('topLeft');
		screenshot('chartBookmark');

		//
		// Assert that the bookmark image matches the original heatmap
		//

		compareScreenshots('chart', 'chartBookmark');
	});
	it('Saves and restores transcript', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		///////////////////////////////////////
		// Bookmark a transcript
		//

		renderATranscript();

		cy.scrollTo('topLeft');
		screenshot('transcript');

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(transcriptPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		nav.waitForTransition();
		transcriptPage.bookmarkLoading().should('not.exist');
		cy.scrollTo('topLeft');
		screenshot('transcriptBookmark');

		//
		// Assert that the bookmark image matches the original heatmap
		//

		compareScreenshots('transcript', 'transcriptBookmark');
	});
	it('Doesn\'t conflict with other pages', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');
		///////////////////////////////////////
		// Restore from transcript page should not alter spreadsheet.
		// Wizard should be functional.
		//
		// Save initial screenshot

		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		spreadsheet.waitForViewport();
		spreadsheet.hoverFirstExample();
		cy.scrollTo('topLeft');
		screenshot('initialSpreadsheet');
		renderATranscript();

		nav.bookmarkMenu().click();
		nav.bookmark().click();
		cy.wait('@bookmark').then(replayBookmark);

		// Loading transcript bookmark
		cy.visit(transcriptPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		transcriptPage.loadingSpinners().should('not.be.visible');

		// Switch to heatmap
		nav.spreadsheet().click();
		nav.waitForTransition();
		spreadsheet.hoverFirstExample();
		cy.scrollTo('topLeft');
		screenshot('afterBookmarkSpreadsheet');

		compareScreenshots('initialSpreadsheet', 'afterBookmarkSpreadsheet');

		// Confirm wizard is functioning
		renderASpreadsheet(false);
	});
	it('Bookmarks wizard states', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		// Do step 1
		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSelect(aCohort);
		wizard.cohortDone().click();

		wizard.geneExpression(); // wait for render

		// screenshot & bookmark step 1
		spreadsheet.hoverFirstExample();
		cy.scrollTo('topLeft');
		screenshot('step1');

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		// load bookmark
		cy.wait('@bookmark').then(replayBookmark);
		cy.visit(heatmapPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));

		wizard.geneExpression(); // wait for render

		spreadsheet.hoverFirstExample();
		cy.scrollTo('topLeft');
		screenshot('step1Bookmark');
		compareScreenshots('step1', 'step1Bookmark');

		// Ensure sure step 2 still works
		wizard.geneExpression().click();
		wizard.somaticMutation().click();
		wizard.copyNumber().click();
		wizard.geneFieldInput().type('TP53');
		wizard.columnDone().click();
		spreadsheet.loadingSpinners().should('not.be.visible');
	});
});
