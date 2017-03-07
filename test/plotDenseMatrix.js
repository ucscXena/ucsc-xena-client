/*global describe: false, it: false, require: false */
'use strict';
var _ = require('../js/underscore_ext');
//var assert = require('assert');
var {column} = require('../js/columnWidgets');
require('../js/plotDenseMatrix');

const TestUtils = require('react-addons-test-utils');
const {renderIntoDocument} = TestUtils;

var basicDenseColumn = {
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
	samples: ['a', 'b'],
	zoom: {
		height: 100,
		index: 0,
		count: 2
	},
	data: {
		req: {}
	},
	disableKM: () => [true, 'a reason']
};


describe('plotDenseMatrix', function () {
    describe('#column', function () {
        it('should render probes', function() {
			renderIntoDocument(column(basicDenseColumn));
        });
        it('should render genes', function() {
			renderIntoDocument(
				column(_.assocIn(basicDenseColumn, ['column', 'fieldType', 'genes'])));
        });
        it('should render geneProbes', function() {
			renderIntoDocument(
				column(_.assocIn(basicDenseColumn, ['column', 'fieldType', 'geneProbes'])));
        });
	});
});
