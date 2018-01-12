'use strict';
/*global cy: false*/

module.exports = {
	url: '/datapages/',
	cohortList: () => cy.get('[class^=Datapages-module__list] li')
};
