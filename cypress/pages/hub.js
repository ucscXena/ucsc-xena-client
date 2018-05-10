'use strict';
/*global cy: false*/

module.exports = {
	url: '/hub/',
	hubList: () => cy.get('[class^=hubPage-module__hubPage] [data-react-toolbox=card] li'),
	hubItem: text => cy.get(`[class^=hubPage-module__hubPage] [data-react-toolbox=card] li:contains('${text}')`)
		.find('[data-react-toolbox=check]'),
	hubs: {
		tcga: 'TCGA hub'
	}
};
