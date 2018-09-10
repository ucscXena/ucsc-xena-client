/*global cy: false*/
'use strict';

var exactMatch = (selector, str)  =>
	cy.get(`:contains('${str}')`)
		.filter(selector)
		.filter((i, x) => x.innerText === str);

var wizard = {
	// The cohort card input field
	cohortInput: () => cy.contains('label', 'Search for a study').siblings('input'),
	cohortSuggestItems: () => cy.get('[class^=AutosuggestTheme-module__suggestion__]'),
	// Select a cohort from the drop-down
	cohortSelect: cohort => exactMatch('li', cohort).click(),
	geneExpression: () => cy.contains('Gene Expression'),
	somaticMutation: () => cy.contains('Somatic Mutation'),
	copyNumber: () => cy.contains('Copy Number'),
	geneFieldInput: () => cy.contains('label', 'Add Gene').siblings('input'),
	cohortDone: () => cy.contains('Done'),
	columnDone: () => cy.contains('Done'),
	cards: () => cy.get('[class^=WizardCard-module]')
};

var spreadsheet = {
	appControlsCohort: () => cy.get('[class*=AppControls-module__cohort]'),
	resetCohort: () => spreadsheet.appControlsCohort().contains('close'),
	chartView: () => cy.get('[title="View as chart"]'),
	heatmapView: () => cy.get('[title="View as columns"]'),
	colControls: i => cy.get('[class^=ColCard-module__controls]').eq(i),
	colCanvas: i => cy.get('.resize-enable').eq(i).find('.Tooltip-target canvas'),
	chart: () => cy.get('.highcharts-root'),
	closeCohort: () => spreadsheet.colControls(0).contains('close'),
	kaplanMeierButton: i => spreadsheet.colControls(i).contains('Kaplan Meier'),
	kaplanMeier: () => cy.get('[class*=km-module__mainDialog]'),
	kaplanMeierClose: () => cy.get('[class*=km-module__mainDialogClose]'),
	loadingSpinners: () => cy.get('[data-xena="loading"]'),
	// over on first example to prevent cycling
	hoverFirstExample: () => cy.get('[class^=Welcome-module__bullet] [data-index="0"]')
		.then(el => el[0].dispatchEvent(new Event('mouseover', {bubbles: true}))),
	waitForViewport: () => cy.wait(200) // 200ms delay to fire viewportWidth
};

var nav = {
	bookmarkMenu: () => cy.get('button:contains("Bookmark")'),
	bookmark: () => cy.get('li:contains("Bookmark")'),
	spreadsheet: () => cy.get('nav').contains('Visualization'),
	transcripts: () => cy.get('nav').contains('Transcripts'),
	datapages: () => cy.get('nav').contains('Data Sets'),
	hub: () => cy.get('nav').contains('Data Hubs'),
	waitForTransition: () => cy.wait(350) // 350ms css transition on navigation buttons
};

module.exports = {
	url: '/heatmap/',
	wizard,
	nav,
	spreadsheet,
	chart: {},
	km: {}
};
