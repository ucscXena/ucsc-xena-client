/*global describe: false, it: flase, browser: false, expect: false, beforeEach: false, afterEach: false */
'use strict';

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
// Assert that sample list is not empty.
// Assert that sample column is shown.
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
});
