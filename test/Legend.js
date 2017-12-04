/*global describe: false, it: false */
'use strict';
const TestUtils = require('react-addons-test-utils');
const {renderIntoDocument} = TestUtils;
var React = require('react');
var Legend = require('../js/views/Legend');

describe.only('Legend', function () {
	it('should render', function() {
		renderIntoDocument(
			<Legend
				labels={['up', 'down']}
				colors={['#aabbcc', '#112233']}
				max={20}
				footnotes={null}/>);
	});
});
