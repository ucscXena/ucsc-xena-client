'use strict';
/*global describe: false, it: false, cy: false, beforeEach: false, expect: false, Cypress: false, before: false, after: false */

var heatmapPage = require('../pages/heatmap');
var {nav, wizard, spreadsheet} = heatmapPage;
var transcriptPage = require('../pages/transcripts');

var merge = (...args) => Object.assign({}, ...args);
var {isArray, findIndex, pick, identity} = Cypress._;

var aCohort = 'TCGA Breast Cancer (BRCA)';
var aTCGAStudy = 'TCGA Lung Adenocarcinoma';
var aGTEXStudy = 'GTEX Lung';
function spy(msg, x) { //eslint-disable-line no-unused-vars
	console.log(msg, x);
	return x;
}

// Strategy here is to run test cases in record mode when
// this is true, but skip any generative tests. Can
// do a record session by setting env in a file, by
// editing this line, or by cli option.
var RECORD = Cypress.env('RECORD'); // default to false

// describe test that does not record.
var describeNR = RECORD ? identity : describe;

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

function disableHelp() {
	window.localStorage.xenaNotifications = '{"rowHelp":true,"columnHelp":true,"zoomHelp":true}';
}

// run a set of side effects
var exec = (...fns) => () => fns.forEach(fn => fn());

// This works around https://github.com/cypress-io/cypress/issues/76
// Large responses can't be stubbed in cypress, due to misdesign. Shim
// the response handler, here.
//
// A different workaround might be possible with
// cy.exec(`echo ${content} > fixtures/bookmark`)
var shimResponse = response => xhr => {
	var orsc = xhr.xhr.onreadystatechange;
	xhr.xhr.onreadystatechange = function() {
		if (this.readyState === 4) {
			Object.defineProperty(this, 'response', {
				writable: true
			});
			this.response = response;
		}
		orsc.apply(this, arguments);
	};
};

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

var ignoreLocalHub = () => {
	// Ignore local hubs that are missing.  Would like to return a
	// connection refused, but I don't think cy.route() will do that.
	// Might be able to use a sinon mock.
	cy.route({
		method: 'POST',
		url: 'https://local.xena.ucsc.edu:7223/*',
		status: 500,
		response: ''
	});
};

function saveFile(file, data) {
	return cy.writeFile(`cypress/${file}.json`, JSON.stringify(data));
}

function readFile(file) {
	return cy.readFile(`cypress/${file}.json`);
}

var playback = responses => xhr => {
	if (xhr.url.match(/sockjs-node/)) {
		return;
	}
	// I think what's happening here is that for responseType 'json'
	// the browser will parse the response before it reaches the app,
	// so we should also provide a 'parsed' response to the app. For
	// other responseTypes, the browser will not parse it for the app,
	// so we should provide an 'unparsed' stringified response.
	var stringify = xhr.xhr.responseType === 'json' ? identity : JSON.stringify,
		i = findIndex(responses, entry =>
			entry.body === xhr.request.body && entry.url === xhr.url);
	if (i === -1) {
		console.error('Missing response for request', xhr);
	}
	shimResponse(stringify(responses[i].response))(xhr);
};

var titleToFile = str => str.replace(/ /g, '-');
function setupPlayback(sources) {
	sources = isArray(sources) ? sources : [sources];
	before(function() {
		this.responses = [];
		sources.forEach(title => {
			readFile(titleToFile(title)).then(q => this.responses.push(...q));
		});
	});
	beforeEach(function() {
		cy.server();
		cy.route({url: '*://**', method: 'POST', onRequest: playback(this.responses), response: 'placeholder'});
		cy.route({url: '*://**', method: 'GET', onRequest: playback(this.responses), response: 'placeholder'});
		ignoreLocalHub();
	});
}

function setupRecord(title) {
	before(function() {
		this.cache = [];
		this.record = xhr => {
			this.cache.push(merge(
				pick(xhr, 'url', 'method', 'status'), {body: xhr.request.body, response: xhr.response.body}));
		};
	});
	after(function() {
		// XXX make unique here
		saveFile(titleToFile(title), this.cache);
	});
	beforeEach(function() {
		cy.server();
		cy.route({url: '*://**', method: 'POST', onResponse: this.record});
		cy.route({url: '*://**', method: 'GET', onResponse: this.record});
		ignoreLocalHub();
	});
}

function playRecord(title) {
	(RECORD ? setupRecord : setupPlayback)(title);
}

describe('Viz page', function() {
	playRecord(this.title);
	it('Renders spreadsheet heatmap and chart', function() {
		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		renderASpreadsheet(false);
		spreadsheet.chartView().click();
		cy.get('.highcharts-root'); // XXX move to page object
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
	cy.contains('no expression'); // stupid way to wait for ajax XXX move to page object
}

// XXX move to different file, or revisit the name of this file.
describe('Transcript page', function() {
	playRecord(this.title);
	it('Draws', renderATranscript);
});

var replayBookmark = xhr => {
	var content = decodeURIComponent(xhr.request.body.slice("content=".length));
	cy.route({
		url: '/api/bookmarks/bookmark*',
		method: 'GET',
		onRequest: shimResponse(content),
		response: 'placeholder',
	}).as('readBookmark');
};

//var rAF = () =>
//	new Cypress.Promise(resolve => window.requestAnimationFrame(() => resolve()));

var screenshot = file => () => {
	// This is a clunky work-around to get cypress controls out of the way while
	// screenshotting.
	var reporter = window.parent.document.getElementsByClassName('reporter-wrap')[0],
		display = reporter.style.display;
	reporter.style.display = 'none';

	return cy.wait(100).screenshot(file).then(() => {
		reporter.style.display = display;
	});
};

var query = url => url.split(/\?/)[1];
var highchartAnimation = 2000; // XXX move to page object
var bootstrapAnimation = 2000;
describeNR.skip('Bookmark', function() {
	setupPlayback(['Viz page', 'Transcript page']);
	it('Saves and restores heatmap and chart', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		///////////////////////////////////////
		// Bookmark a spreadsheet
		//

		renderASpreadsheet();

		cy.scrollTo('topLeft').then(screenshot('heatmap'));

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(heatmapPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		spreadsheet.loadingSpinners().should('not.be.visible');
		cy.scrollTo('topLeft').then(screenshot('heatmapBookmark'));

		//
		// Assert that the bookmark image matches the original heatmap
		//

		cy.exec('babel-node cypress/compareImages.js heatmap heatmapBookmark')
			.its('stdout').should('contain', 'same');

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

		// XXX move to page object
		spreadsheet.colControls(1).contains('Kaplan Meier').click({force: true});
		cy.wait(bootstrapAnimation);
		cy.get('.kmDialog'); // XXX move to page object
		cy.scrollTo('topLeft').then(screenshot('kaplanMeier'));

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(heatmapPage.url + '?bookmark=a1b2', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=a1b2'));
		spreadsheet.loadingSpinners().should('not.be.visible');
		cy.wait(bootstrapAnimation);
		cy.scrollTo('topLeft').then(screenshot('kaplanMeierBookmark'));

		//
		// Assert that the bookmark image matches the original KM
		//

		cy.exec('babel-node cypress/compareImages.js kaplanMeier kaplanMeierBookmark')
			.its('stdout').should('contain', 'same');

		// XXX move to page object
		cy.get('.kmDialog .close').click();

		///////////////////////////////////////
		// Bokmark chart mode
		//

		spreadsheet.chartView().click();

		// XXX move to page object
		cy.get('.highcharts-root').wait(highchartAnimation);
		cy.scrollTo('topLeft').then(screenshot('chart'));

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
		cy.scrollTo('topLeft').then(screenshot('chartBookmark'));

		//
		// Assert that the bookmark image matches the original heatmap
		//

		cy.exec('babel-node cypress/compareImages.js chart chartBookmark')
			.its('stdout').should('contain', 'same');
	});
	it('Saves and restores transcript', function() {
		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		///////////////////////////////////////
		// Bookmark a transcript
		//

		renderATranscript();

		cy.scrollTo('topLeft').then(screenshot('transcript'));

		nav.bookmarkMenu().click();
		nav.bookmark().click();

		//
		// Capture the bookmark, and load it in a new session
		//

		cy.wait('@bookmark').then(replayBookmark);

		cy.visit(transcriptPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		cy.contains('no expression'); // stupid way to wait for ajax XXX move to page object
		cy.scrollTo('topLeft').then(screenshot('transcriptBookmark'));

		//
		// Assert that the bookmark image matches the original heatmap
		//

		cy.exec('babel-node cypress/compareImages.js transcript transcriptBookmark')
			.its('stdout').should('contain', 'same');
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
		// Hide "View live example" link because it keeps changing.
		spreadsheet.examples().then(el => el.hide());
		cy.scrollTo('topLeft').then(screenshot('initialSpreadsheet'));
		spreadsheet.examples().then(el => el.show());
		renderATranscript();

		nav.bookmarkMenu().click();
		nav.bookmark().click();
		cy.wait('@bookmark').then(replayBookmark);

		// Loading transcript bookmark
		cy.visit(transcriptPage.url + '?bookmark=1234', {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));
		cy.contains('no expression'); // stupid way to wait for ajax XXX move to page object

		// Switch to heatmap
		nav.heatmap().click();
		nav.waitForTransition();
		spreadsheet.examples().then(el => el.hide());
		cy.scrollTo('topLeft').then(screenshot('afterBookmarkSpreadsheet'));
		spreadsheet.examples().then(el => el.show());

		cy.exec('babel-node cypress/compareImages.js initialSpreadsheet afterBookmarkSpreadsheet')
			.its('stdout').should('contain', 'same');

		// Confirm wizard is functioning
		renderASpreadsheet(false);
	});
	it.skip('Bookmarks wizard states', function() {
//		cy.route('POST', '/api/bookmarks/bookmark', '{"id": "1234"}').as('bookmark');

		// Do step 1
		cy.visit(heatmapPage.url, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		wizard.cohortInput().type(aCohort.slice(0, 10));
		wizard.cohortSelect(aCohort);
		wizard.cohortDone().click();

		// screenshot & bookmark step 1
		spreadsheet.examples().then(el => el.hide());
		cy.scrollTo('topLeft').then(screenshot('step1'));
		spreadsheet.examples().then(el => el.show());

//		nav.bookmarkMenu().click();
//		nav.bookmark().click();

		// load bookmark
//		cy.wait('@bookmark').then(replayBookmark);
		cy.visit(heatmapPage.url);
//		cy.wait('@readBookmark').then(xhr => expect(query(xhr.url)).to.equal('id=1234'));

		wizard.cards(); // wait for render

		spreadsheet.examples().then(el => el.hide());
		cy.scrollTo('topLeft').then(screenshot('step1Bookmark'));
		spreadsheet.examples().then(el => el.show());
		cy.exec('babel-node cypress/compareImages.js step1 step1Bookmark');

		// Ensure sure step 2 still works
		wizard.geneExpression().click();
		wizard.somaticMutation().click();
		wizard.copyNumber().click();
		wizard.geneFieldInput().type('TP53');
		wizard.columnDone().click();
		spreadsheet.loadingSpinners().should('not.be.visible');

	});
});
