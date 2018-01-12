'use strict';
/*global cy: false*/

module.exports = {
	url: '/transcripts/',
	studyA: () => cy.get(':contains("Study A") + select'),
	studyB: () => cy.get(':contains("Study B") + select'),
	geneFieldInput: () => cy.contains('label', 'Add Gene').siblings('input'),
	updateGene: () => cy.contains('Update Gene'),
	geneIsLoaded: () => cy.contains('no expression') // stupid way to wait for ajax
};
