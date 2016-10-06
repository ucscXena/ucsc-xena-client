/*global browser: false */
'use strict';
var {clickWhenStill, clickWhenVisible, clickWhenEnabled} = require('./utils');

/* Note on matching text:

text() is a node match (matches a text node), not a function.
//foo/text() matches text nodes immediately under foo nodes.
//foo[text()] matches foo nodes with immediately following text nodes.
//foo[text()="bar"] matches foo nodes with immediately following text nodes having content "bar".
//foo[.//text()="bar"] matches foo nodes with text node descendants having content "bar".

*/

var m = (methods, exp, defaultMethod) => {
	let [type, ...args] = exp,
		method = methods[type];
	return method ? method(...args) : defaultMethod(exp);
};

var hasClass = name => `contains(concat(" ", @class, " "), " ${name} ")`;

var cohortSelect = {
	// button in a form-group which also contains a 'Cohort' label.
	open: '//*[@class="form-group"][.//label[text()="Cohort"]]//button',
	// class dropdown-menu in a form-group which also contains a 'Cohort' label.
	menu: '//*[@class="form-group"][.//label[text()="Cohort"]]//*[@class="dropdown-menu"]',
	// element having text ${cohort} in a form-group which also contains a 'Cohort' label.
	item: cohort => `//*[@class="form-group"][.//label[text()="Cohort"]]//*[.="${cohort}"]`,
	labelText: 'Cohort',
	samplesFromText: 'Samples in'
};

var modeButton = {
	chartText: 'Chart',
	heatmapText: 'Visual Spreadsheet'
};
// Class 'btn' (bootstrap button) element with text chartText or heatmapText
modeButton.element = `//*[${hasClass('btn')}][text()="${modeButton.chartText}" or text()="${modeButton.heatmapText}"]`;

var columnAdd = {
	open: `//*[${hasClass("Column-add-button")}]`,
	close: `//button[${hasClass("close")}]`,
	// element having class 'btn' and a text descendant with content "Next"
	next: `//*[${hasClass("btn")}][.//text()="Next"]`,
	done: `//*[${hasClass("btn")}][.//text()="Done"]`,
	pane: {
		cohort: {
			title: 'Select a cohort',
			cohortText: 'Cohort',
			selectorEmptyText: 'Please select',
			selector: `//button[${hasClass("Select")}]`,
			next: '//button[./*[text()="Select"]]',
			nextText: 'Select'
		},
		dataset: {
			phenotype: `//*[${hasClass('columnEditBody')}]//*[${hasClass('panel-title')}][.="phenotype"]`,
			sections: `//*[${hasClass('columnEditBody')}]//a[@role="tab"]`,
			// On linux, the anchor has zero width/hight, and selenium won't click
			// on it. So, click on the span inside the anchor.
			section: name => `//*[${hasClass('columnEditBody')}]//a[@role="tab"]//span[.="${name}"]`,
			// This was working on OSX
			//section: name => `//*[${hasClass('columnEditBody')}]//a[@role="tab"][text()="${name}"]`,
			dataset: name => `//*[${hasClass('columnEditBody')}]//a[${hasClass("list-group-item")}][.="${name}"]`
		},
		geneProbeSelect: {
			input: `//*[${hasClass('columnEditBody')}]//textarea`
		},
		phenotypeSelect: {
			open: `//*[${hasClass('columnEditBody')}]//*[${hasClass('dropdown-toggle')}]`,
			item: field => `//*[${hasClass('columnEditBody')}]//*[@role="menuitem"][.="${field}"]`
		}
	}
};

var columns = {
	// XXX This is crazy hacky & needs to be fixed. We have no classes work with in spreadsheet columns.
	// This will also match the error img, for example.
	loading: `//*[${hasClass('Column')}]//*[${hasClass('resizeOverlay')}]//img`
};

var column = {
	title: t => `//*[${hasClass('Column')}]//input[@value="${t}"]`
};

var yAxis = {
	samples: '//*[@class="YAxisLabel"]',
	sampleCountPattern: /Samples.*N\s*=\s*(\d+)/
};

var actions = {
	openCohortSelect: () => clickWhenVisible(cohortSelect.open),
	selectCohort: cohort => {
		actions.openCohortSelect();
		clickWhenVisible(cohortSelect.item(cohort));
	},
	getCohort: () => browser.getText(cohortSelect.open),
	toggleMode: () => browser.element(modeButton.element).click(),
	getMode: () => browser.element(modeButton.element).getText(),
	closeColumnAdd: () => clickWhenVisible(columnAdd.close),
	openPhenotypeDataset: field => {
		browser.element(columnAdd.open).click(); // XXX race, not found? called from 'refactor'
		clickWhenStill(columnAdd.pane.dataset.phenotype);
		clickWhenEnabled(columnAdd.next);

		var {phenotypeSelect} = columnAdd.pane;
		clickWhenVisible(phenotypeSelect.open);
		// XXX Note this won't scroll the item on-screen, so currently only works
		// for items at the top.
		clickWhenVisible(phenotypeSelect.item(field));
		clickWhenEnabled(columnAdd.done);
	},
	openDataset: (name, section, type, fields) => {
		if (name === 'phenotype') {
			return actions.openPhenotypeDataset(section);
		}
		browser.element(columnAdd.open).click(); // XXX race, not found? called from 'refactor'

		clickWhenStill(columnAdd.pane.dataset.section(section));
		clickWhenVisible(columnAdd.pane.dataset.dataset(name));
		clickWhenStill(columnAdd.next);
		m({
			geneMatrix: fields => {
				clickWhenVisible(columnAdd.pane.geneProbeSelect.input);
				browser.keys(fields.join(', '));
			}
		}, [type, fields], ([type]) => {throw new Error(`No field method for column type ${type}`);});
		clickWhenEnabled(columnAdd.done);
	},
	// number of column 'loading' images on page
	getLoadingCount: () => (browser.elements(columns.loading).value || []).length,
	// wait for all column data to load
	waitForColumnData: () => browser.waitUntil(
				() => actions.getLoadingCount() === 0,
				10000, 'waiting for column data to load', 200),
	// wait for a specific column to be created, by dataset name
	waitForColumn: name => browser.waitForVisible(column.title(name))
};

module.exports = {
	title: 'UCSC Xena',
	columnAdd,
	cohortSelect,
	yAxis,
	actions,
	modeButton,
	columns,
	column
};
