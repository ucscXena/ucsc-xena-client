/*global describe: false, it: false, require: false */
'use strict';
var _ = require('../js/underscore_ext');
//var assert = require('assert');
var {column} = require('../js/columnWidgets');
require('../js/plotDenseMatrix');
require('rx/dist/rx.time');

const TestUtils = require('react-addons-test-utils');
const {renderIntoDocument} = TestUtils;

var basicDenseColumn = {
	column: {
		columnLabel: {user: 'foo', default: 'foo'},
		fieldLabel: {user: 'foo', default: 'foo'},
		width: 20,
		dataType: 'probeMatrix',
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
        it('should render probeMatrix', function() {
			renderIntoDocument(column(basicDenseColumn));
        });
        it('should render geneMatrix', function() {
			renderIntoDocument(
				column(_.assocIn(basicDenseColumn, ['column', 'dataType', 'geneMatrix'])));
        });
        it('should render geneProbesMatrix', function() {
			renderIntoDocument(
				column(_.assocIn(basicDenseColumn, ['column', 'dataType', 'geneProbesMatrix'])));
        });
	});
});
