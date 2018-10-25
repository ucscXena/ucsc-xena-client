'use strict';
/*global describe: false, it: false, cy: false, beforeEach: false, expect: false, Cypress: false, before: false, after: false */

var heatmapPage = require('../pages/heatmap');

function clearSessionStorage() {
	window.sessionStorage.clear();
}

function disableHelp() {
	window.localStorage.xenaNotifications = '{"rowHelp":true,"columnHelp":true,"zoomHelp":true}';
}

// run a set of side effects
var exec = (...fns) => () => fns.forEach(fn => fn());

var screenshot = file => {
	cy.wait(200);

	// XXX disable responsive layout during screeshot
	cy.window().then(w => w.cypressScreenshot = true);
	cy.screenshot(file);
	return cy.window().then(w => w.cypressScreenshot = false); // XXX move this to common pre-method or post-method, so it runs even if we crash
};

describe('bookmark screenshot', function() {
	it('should run screeshot', function() {
		var bookmark = Cypress.env('BOOKMARK');
		cy.visit(heatmapPage.url + `?bookmark=_${bookmark}`, {onBeforeLoad: exec(clearSessionStorage, disableHelp)});
		cy.contains('Loading your view', {timeout: 10000}).should('not.be.visible');
		cy.wait(2000); // XXX wrong wait
		cy.scrollTo('topLeft');
		screenshot('bookmark-' + bookmark);

		cy.wrap(true).then(() => {
			var mode = Cypress.$('[class^=AppControls-module__actions] i').first();
			if (mode.length && mode[0].title === 'View as columns') {
				mode[0].click();
				cy.wait(2000); // XXX wrong wait
				screenshot('bookmark-' + bookmark + '-spreadsheet');
			} else if (Cypress.$('[class^=km-module__graph').length === 1) {
				heatmapPage.spreadsheet.kaplanMeierClose().click();
				cy.wait(2000); // XXX wrong wait
				screenshot('bookmark-' + bookmark + '-spreadsheet');
			}
		});
	});
});
