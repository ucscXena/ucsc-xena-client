/*global require: false, describe: false, it: flase, browser: false, expect: false */
'use strict';

var data = require('./data');
var page = require('./page-visualization');
var actions = page.actions;
var jv = require('jsverify');

var cohortSelect = page.cohortSelect;

var url = 'http://127.0.0.1:8080';

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

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

// Select a cohort.
// Assert that cohort name is displayed on page.
// Assert that sample list is not empty.
// Assert that sample column is shown.
//
// This can fail due to very long query on poor networks (e.g. at a conference).
function cohortSelection(cohort) {

	// Select a cohort.
	actions.openCohortSelect(browser);
	browser.element(cohortSelect.menu).element(`=${cohort}`).waitForVisible(60000);
	browser.element(cohortSelect.menu).click(`=${cohort}`);

	// XXX write custom chai 'to.contain' instead of RegExp?
	expect(browser.getText('body')).to.match(new RegExp(escapeRegExp(cohort)));

//	var sampleText = browser.getText(page.yAxis.samples),
//		sampleMatch = sampleText.match(page.yAxis.sampleCountPattern),
//		sampleCount = sampleMatch && parseInt(sampleMatch[1], 10);
//
//	expect(sampleMatch).to.not.be.null;
//	expect(sampleCount).to.not.equal(0);

	var selectedCohort = browser.getText(page.cohortSelect.open);
	expect(selectedCohort).to.equal(cohort);

	return true;
}

//function spy(msg, x) {
//	console.log(msg, x);
//	return x;
//}

describe('Xena Client', function() {
  describe('Cohort', function () {
    it('should be set by cohort selector @watch', function () {
      browser.url(url);
      expect(browser.getTitle()).to.equal(page.title);

	  browser.element(page.columnAdd.pane.close).click();
      cohortSelection('TCGA Breast Cancer (BRCA)');
    });
    it('should be set by cohort selector, random @watch', function () {
      browser.url(url);
      expect(browser.getTitle()).to.equal(page.title);
      var arbCohort = jv.oneof(data.cohorts.map(jv.constant));
	  var result = jv.check(jv.forall(arbCohort, cohortSelection), {tests: 5});
	  expect(result).to.equal(true);
    });
  });
});
