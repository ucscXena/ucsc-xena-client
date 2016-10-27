/*global describe: false, it: flase, browser: false, expect: false, beforeEach: false, afterEach: false, before: false */
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

var data = require('./data');
var page = require('./page-visualization');
var hub = require('./page-hub');
var actions = page.actions;
var {saveScreenshot} = require('./utils');
var jv = require('jsverify');
var assert = require('assert');

var url = 'http://127.0.0.1:8080';
var devurl = 'http://ec2-52-91-68-9.compute-1.amazonaws.com';
var huburl = url => `${url}/hub/`;

var svhub = process.env.SVHUB;
assert(svhub, 'svhub not set');

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
		it('should toggle mode', function () {
			var {chartText, heatmapText} = page.modeButton;
			actions.selectCohort('TCGA Breast Cancer (BRCA)');

			var mode = actions.getMode();
			actions.toggleMode();
			var nextMode = actions.getMode();
			expect(nextMode).to.equal(mode === chartText ? heatmapText : chartText);
		});
		it('should select dataset', function () {
			actions.selectCohort('TCGA Breast Cancer (BRCA)');
			actions.openDataset('copy number', 'copy number', 'geneMatrix', ['tp53']);
		});
	});
	describe('hub', function () {
		beforeEach(function () {
			browser.newWindow(huburl(url));
			expect(browser.getTitle()).to.equal(hub.title);
		});
		afterEach(function () {
			browser.close();
		});
		it('should select hub', function () {
			hub.actions.addHub(svhub);
			browser.waitUntil(
				() => hub.actions.getStatus(svhub) === hub.status.connected,
				2000, 'waiting for hub to connect', 200);
		});
	});
	describe('refactor', function () {
		this.timeout(60000);
		before(function () {
			browser.setViewportSize({width: 1000, height: 800}, true);
		});
		it('should preserve "unit" in dense matrix legend', function () {
			function drawExpression(url) {
				browser.newWindow(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');
				// dataset with 'unit'
				var name = 'gene expression RNAseq (ployA+ IlluminaHiSeq pancan normalized)';
				actions.openDataset(name,
									'gene expression RNAseq',
									'geneMatrix', ['tp53']);

				actions.waitForColumn(name);
				actions.waitForColumnData();
				var screenshot = saveScreenshot(`./expression-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawExpression(devurl);
			var ss2 = drawExpression(url);

			expect(ss1.equals(ss2)).to.be.true;
		});
		it('should preserve "unit" in dense matrix chart', function () {
			function drawExpression(url) {
				browser.newWindow(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');
				// dataset with 'unit'
				var name = 'gene expression RNAseq (ployA+ IlluminaHiSeq pancan normalized)';
				actions.openDataset(name,
									'gene expression RNAseq',
									'geneMatrix', ['tp53']);

				actions.waitForColumn(name);
				actions.waitForColumnData();
				actions.toggleMode();
				actions.waitForChart();
				var screenshot = saveScreenshot(`./chart-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawExpression(devurl);
			var ss2 = drawExpression(url);

			expect(ss1.equals(ss2)).to.be.true;
		});
		it('should preserve float legend w/o unit', function () {
			function drawPhenotype(url) {
				browser.newWindow(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');

				actions.openDataset('phenotype', 'age at initial pathologic diagnosis');
				actions.waitForColumn('Phenotypes');
				actions.waitForColumnData();
				var screenshot = saveScreenshot(`phenotype-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawPhenotype(url);
			var ss2 = drawPhenotype(devurl);

			expect(ss1.equals(ss2)).to.be.true;
		});
		it('should preserve float chart', function () {
			function drawPhenotype(url) {
				browser.newWindow(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');

				actions.openDataset('phenotype', 'age at initial pathologic diagnosis');
				actions.waitForColumn('Phenotypes');
				actions.waitForColumnData();
				actions.toggleMode();
				actions.waitForChart();
				var screenshot = saveScreenshot(`chart-phenotype-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawPhenotype(url);
			var ss2 = drawPhenotype(devurl);

			expect(ss1.equals(ss2)).to.be.true;
		});
		it('should preserve mutation view', function () {
			function drawMutation(url) {
				browser.newWindow(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('TCGA Breast Cancer (BRCA)');
				var dataset = 'somatic mutation SNPs and small INDELs (wustl curated)';

				actions.openDataset(dataset, 'somatic mutation (SNPs and small INDELs)', 'mutation', 'tp53');
				actions.waitForColumn(dataset);
				actions.waitForColumnData();
				var screenshot = saveScreenshot(`mutation-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawMutation(url);
			var ss2 = drawMutation(devurl);

			expect(ss1.equals(ss2)).to.be.true;
		});
		it('should preserve SV view', function () {
			function drawSV(url) {
				browser.newWindow(url); // work around /hub/ page not working if visited first
				expect(browser.getTitle()).to.equal(page.title);
				browser.element(page.cohortSelect.open).waitForExist();
				browser.url(huburl(url));
				expect(browser.getTitle()).to.equal(hub.title);
				hub.actions.addHub(svhub);
				browser.url(url);
				expect(browser.getTitle()).to.equal(page.title);
				actions.closeColumnAdd(); // XXX not visible after 6s?
				actions.selectCohort('PCAWG');
				var dataset = 'PCAWG6 Structural Variant merge set v 1.2';

				actions.openDataset(dataset, 'somatic mutation (structural variant)', 'mutation', 'tp53');
				actions.waitForColumn(dataset);
				actions.waitForColumnData();
				var screenshot = saveScreenshot(`sv-${url.replace(/[\/:]/g, '_')}.png`);
//				var screenshot = saveScreenshot();
				browser.close();
				return screenshot;
			}
			var ss1 = drawSV(url);
			var ss2 = drawSV(devurl);

			expect(ss1.equals(ss2)).to.be.true;
		});
	});
	describe('bookmarks', function () {
		this.timeout(60000);
		before(function () {
			browser.setViewportSize({width: 1000, height: 800}, true);
		});
		var bookmarks = [
			"f058b182244540dc61f9095b0e98683b",
			"796773f751215e1b5dc0a16acb06db52",
			"d2cd9c3ccaf4ea8d6b8f6317d20cfa4d",
			"65e35cb1f31de34178bf1ec230bfed16",
			"daa598ef1ba152825ac7f5e6ec72f9f1"];
		bookmarks.forEach(bookmark => {
			it(`should preserve bookmark ${bookmark}`, function () {
				function drawBookmark(url) {
					browser.newWindow(url); // work around /hub/ page not working if visited first
					expect(browser.getTitle()).to.equal(page.title);
					// XXX fix this
					browser.pause(5000);
					var screenshot = saveScreenshot(`bookmark-${url.replace(/[\/:]/g, '_')}.png`);
	//				var screenshot = saveScreenshot();
					browser.close();
					return screenshot;
				}

				var url1 = `${devurl}/heatmap/?bookmark=${bookmark}`;
				var url2 = `http://localhost:8080/heatmap/?bookmark=${bookmark}`;
				var ss1 = drawBookmark(url1);
				var ss2 = drawBookmark(url2);
				expect(ss1.equals(ss2)).equal(true, `bookmark ${bookmark} failed\n${url1}\n${url2}`);
			});
		});
	});
});
