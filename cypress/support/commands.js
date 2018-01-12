'use strict';
/*global Cypress: false, cy: false, beforeEach: false */
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })

Cypress.Commands.each(({name}) =>
	Cypress.Commands.overwrite(name, (fn, ...args) => {
		if (cy.state('softerror')) {
			return fn(...args).catch(err => {
				var n = cy.state('current').get('next');
				while (n && n.get('name') !== 'recover') {
					n.skip();
					n = n.get('next');
				}
				cy.state('abort', err);
				Cypress.log({
					displayName: `softerror(${name})`,
					consoleProps: () => ({err})});
			});
		} else {
			return fn(...args);
		}
	}));

Cypress.Commands.add('softerror', () => {
	cy.state('softerror', true);
});

Cypress.Commands.add('recover', () => {
	var s = cy.state('abort');
	cy.state('abort', false);
	return cy.wrap(s);
});

// root mocha hook
beforeEach(function() {
	cy.state('softerror', false);
});
