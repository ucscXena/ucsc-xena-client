/*global describe: false, it: false, require: false */
'use strict';
//var _ = require('../js/underscore_ext');
//var assert = require('assert');
var {column} = require('../js/columnWidgets');
require('../js/plotMutationVector');

const TestUtils = require('react-addons-test-utils');
const {renderIntoDocument} = TestUtils;
var {index} = require('static-interval-tree');

var basicMutationColumn = {
	column: {
		columnLabel: {user: 'foo', default: 'foo'},
		fieldLabel: {user: 'foo', default: 'foo'},
		sFeature: 'impact',
		width: 20,
		dataType: 'mutationVector',
		fields: ['TP53'],
		layout: {
			chrom: [[1000, 1200], [1300, 1500]],
			screen: [[0, 100], [110, 200]],
			reversed: false
		}
	},
	samples: ['a', 'b', 'c', 'd'],
	zoom: {
		height: 100,
		index: 0,
		count: 2
	},
	index: {
		byPosition: index([
			{start: 1000, end: 1010, chr: 'chr10', sample: 'a'},
			{start: 2000, end: 2010, chr: 'chr10', sample: 'a'},
			{start: 1000, end: 1010, chr: 'chr10', sample: 'b'}
			]),
		bySample: { // should be in 'display'
			'a': [
				{start: 1000, end: 1010, chr: 'chr10', sample: 'a'},
				{start: 2000, end: 2010, chr: 'chr10', sample: 'a'}
				],
			'b': [
				{start: 1000, end: 1010, chr: 'chr10', sample: 'b'}
				],
			'c': []
		}
	},
	data: {
		refGene: {
			'TP53': {
				cdsStart: 900,
				cdsEnd: 3000
			}
		},
		req: {
		}
	}
};


describe('plotMutationVector', function () {
    describe('#column', function () {
        it('should render mutationVector', function() {
			renderIntoDocument(column(basicMutationColumn));
        });
	});
});
