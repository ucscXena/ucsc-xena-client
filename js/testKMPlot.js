'use strict';
//var _ = require('../js/underscore_ext');
//var assert = require('assert');
var {column} = require('../js/columnWidgets');
require('../js/KmPlot');

const TestUtils = require('react-addons-test-utils');
const {renderIntoDocument} = TestUtils;

var basicKmPlot = {
	column: {
		columnLabel: 'foo',
		fieldLabel: 'foo',
		user: {columnLabel: 'foo', fieldLabel: 'foo'},
		width: 20,
		fieldType: 'probes',
		valueType: 'float',
		fetchType: 'xena',
		fields: ['TP53'],
		heatmap: [[1, 2]],
		colors: [['float-thresh', 'red', 'white', 'blue', -10, -1, 1, 10]]
	},
};


describe('KmPlot', function () {
});
