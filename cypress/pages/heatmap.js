/*global cy: false*/
'use strict';

var exactMatch = (selector, str)  =>
	cy.get(`:contains('${str}')`)
		.filter(selector)
		.filter((i, x) => x.innerText === str);

var wizard = {
	// The cohort select input field
	cohortInput: () => cy.contains('label', 'Study').siblings('input'),
	// select a cohort from the drop-down
	cohortSelect: cohort => exactMatch('li', cohort).click(),
	geneExpression: () => cy.contains('Gene Expression'),
	somaticMutation: () => cy.contains('Somatic Mutation'),
	copyNumber: () => cy.contains('Copy Number'),
	geneFieldInput: () => cy.contains('label', 'Add Gene').siblings('input')
};

var spreadsheet = {
	chartView: () => cy.get('[title="View as chart"]')
};

module.exports = {
	url: '/heatmap/',
	wizard,
	spreadsheet,
	chart: {},
	km: {}
};
