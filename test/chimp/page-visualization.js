/*global require: false, module: false */
'use strict';

var hasClass = name => `contains(concat(" ", @class, " "), "${name}")`;

var cohortSelect = {
	// button in a form-group which also contains a 'Cohort' label.
	open: '//*[@class="form-group"][.//label[text()="Cohort"]]//button',
	// class dropdown-menu in a form-group which also contains a 'Cohort' label.
	menu: '//*[@class="form-group"][.//label[text()="Cohort"]]//*[@class="dropdown-menu"]',
	labelText: 'Cohort',
	samplesFromText: 'Samples in'
};

var columnAdd = {
	open: `//*[${hasClass("Column-add-button")}]`,
	pane: {
		close: `//button[${hasClass("close")}]`,
		cohort: {
			title: 'Select a cohort',
			cohortText: 'Cohort',
			selectorEmptyText: 'Please select',
			selector: `//button[${hasClass("Select")}]`,
			next: '//button[./*[text()="Select"]]',
			nextText: 'Select'
		}
	}
};

var yAxis = {
	samples: '//*[@class="YAxisLabel"]',
	sampleCountPattern: /Samples.*N\s*=\s*(\d+)/
};

var actions = {
	openCohortSelect: browser => browser.click(cohortSelect.open),
	selectCohort: (browser, name) => {
		browser.waitForVisible(cohortSelect.open);
		actions.openCohortSelect(browser);
		browser.element(cohortSelect.menu).click(`=${name}`);
	}
};

module.exports = {
	title: 'UCSC Xena',
	columnAdd,
	cohortSelect,
	yAxis,
	actions
};
