'use strict';
/*global cy: false*/

module.exports = {
	url: '/hub/',
	hubList: () => cy.get('[class^=hubPage-module__hubPage] card li')
};
