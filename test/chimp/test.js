/*global describe: false, it: flase, browser: false, expect: false, beforeEach: false, afterEach: false */
'use strict';

// Note that expect() is from chai, not jasmine.

// monkey-patch mocha colors so they are visible. Might want to move
// this to a utility file.
var colors = require('mocha/lib/reporters/base').colors;
Object.assign(colors, {
	'error stack': '60',
	'pass': '60',
	'fast': '60',
	'light': '60',
	'diff gutter': '60'
});
//

var data = require('./data');
var page = require('./page-visualization');
var hub = require('./page-hub');
var actions = page.actions;
var jv = require('jsverify');

var url = 'http://127.0.0.1:8080';
var devurl = 'http://ec2-52-91-68-9.compute-1.amazonaws.com';
var huburl = `${url}/hub/`;

var svhub = process.env.SVHUB;

// notes on codecept functionality. We are not using codecept.
//
// I.click scans for clickable things (image, etc.) around
// the locator. This probably makes the selector more robust
// against changes in page layout. Also creates an xpath
// selector for literal strings.
//
// I.see fills in context 'body' if none is given. Also does some
// work to create a meaningful assertion string based on context, e.g.
// 'web page' or 'element <foo>'.
//
// codecept provides an operator, 'within', or something like that,
// that fixes a context for further operators. Might help to modularize
// selectors.

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions

//function escapeRegExp(string) {
//  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
//}

// Select a cohort.
// Assert that cohort name is displayed on page.
// Assert that sample list is not empty. XXX
// Assert that sample column is shown. XXX
//

// Set cohort and verify that cohort is set.
function cohortSelection(cohort) {
	actions.selectCohort(cohort);
	var nextCohort = actions.getCohort();

	expect(nextCohort).to.equal(cohort);
	return true; // return success, for jv.check
}

//function spy(msg, x) {
//	console.log(msg, x);
//	return x;
//}
//var fs = require('fs');
//function pause() {
//	console.log('^D to continue');
//	// Only works on linux.
//	fs.readFileSync('/dev/pts/20');
//	console.log('continuing');
//}

describe('Xena Client', function() {
	describe('Cohort', function () { // XXX rename heading, or move unrelated tests
		beforeEach(function () {
			browser.newWindow(url);
			expect(browser.getTitle()).to.equal(page.title);
			actions.closeColumnAdd();
		});
		afterEach(function () {
			browser.close();
		});
		it('should be set by cohort selector', function () {
			cohortSelection('TCGA Breast Cancer (BRCA)');
		});
		it('should be set by cohort selector, random', function () {
			var arbCohort = jv.oneof(data.cohorts.map(jv.constant));
			var result = jv.check(jv.forall(arbCohort, cohortSelection), {tests: 5});
			expect(result).to.equal(true);
		});
		it('should toggle mode @watch', function () {
			var {chartText, heatmapText} = page.modeButton;
			actions.selectCohort('TCGA Breast Cancer (BRCA)');

			var mode = actions.getMode();
			actions.toggleMode();
			var nextMode = actions.getMode();
			expect(nextMode).to.equal(mode === chartText ? heatmapText : chartText);
		});
		it('should select dataset @watch', function () {
			actions.selectCohort('TCGA Breast Cancer (BRCA)');
			actions.openDataset('copy number', 'copy number', 'geneMatrix', ['tp53']);
		});
	});
	describe('hub', function () {
		beforeEach(function () {
			browser.newWindow(huburl);
			expect(browser.getTitle()).to.equal(hub.title);
		});
		afterEach(function () {
			browser.close();
		});
		it('should select hub @watch', function () {
			hub.actions.addHub(svhub);
			browser.waitUntil(
				() => hub.actions.getStatus(svhub) === hub.status.connected,
				2000, 'waiting for hub to connect', 200);
		});
	});
	describe.skip('refactor', function () {
		beforeEach(function () {
			browser.newWindow(huburl);
			expect(browser.getTitle()).to.equal(hub.title);
		});
		afterEach(function () {
			browser.close();
		});
		it('should preserve "unit" in dense matrix legend', function () {
			function drawExpression(url) {
				browser.setViewportSize({width: 1000, height: 8000}, true);
				browser.url(huburl);
				hub.actions.addHub(svhub);
				browser.url(url);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');
				// dataset with 'unit'
				var name = 'gene expression RNAseq (ployA+ IlluminaHiSeq pancan normalized)';
				actions.openDataset(name,
									'gene expression RNAseq',
									'geneMatrix', ['tp53']);

				actions.waitForColumn(name);
				actions.waitForColumnData();
//				return browser.saveScreenshot(`./expression-${url.replace(/.*\/\//, '')}.png`);
				return browser.saveScreenshot();
			}
			var ss1 = drawExpression(url);
			var ss2 = drawExpression(devurl);

			expect(ss1).to.deep.equal(ss2);
		});
		it('should preserve float legend w/o unit', function () {
			function drawPhenotype(url) {
				browser.setViewportSize({width: 1000, height: 8000}, true);
				browser.url(huburl);
				hub.actions.addHub(svhub);
				browser.url(url);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');

				actions.openDataset('phenotype', 'age at initial pathologic diagnosis');
				actions.waitForColumn('Phenotypes');
				actions.waitForColumnData();
				//browser.saveScreenshot('phenotype.png');
				return browser.saveScreenshot();
			}
			var ss1 = drawPhenotype(url);
			var ss2 = drawPhenotype(devurl);

			expect(ss1).to.deep.equal(ss2);
		});
	});
});
