/*global describe: false, it: false */
import {renderIntoDocument} from 'react-dom/test-utils';
var React = require('react');
var Legend = require('../js/views/Legend');

describe('Legend', function () {
	it('should render', function() {
		renderIntoDocument(
			<Legend
				labels={['up', 'down']}
				colors={['#aabbcc', '#112233']}
				max={20}
				footnotes={null}/>);
	});
});
