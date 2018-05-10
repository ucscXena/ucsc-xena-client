'use strict';
/*global cy: false*/

var exactMatch = (selector, str)  =>
	cy.get(`:contains('${str}')`)
		.filter(selector)
		.filter((i, x) => x.innerText === str);

module.exports = {
	url: '/datapages/',
	cohortList: () => cy.get('[class^=Datapages-module__list] li'),
	cohortSelect: cohort => exactMatch('abbr', cohort).click(),
	cohortVisualize: () => cy.contains('Visualize')
};
