/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

//var _ = require('../js/underscore_ext');
var {xenaFieldPaths, updateFields} = require('../js/models/fieldSpec');

var assert = require('assert');

describe('fieldSpec', function () {
	describe('xenaFieldPaths', function () {
		it('return top-level xena field', function () {
			assert.deepEqual([[]], xenaFieldPaths({
				fetchType: 'xena'
			}));
		});
		it('return composite fields', function () {
			assert.deepEqual([['fieldSpecs', 0], ['fieldSpecs', 2]], xenaFieldPaths({
				fetchType: 'composite',
				fieldSpecs: [{
					fetchType: 'xena'
				}, {
					fetchType: 'foo'
				}, {
					fetchType: 'xena'
				}]
			}));
		});
		it('return nested composite fields', function () {
			assert.deepEqual([['fieldSpecs', 0], ['fieldSpecs', 1, 'fieldSpecs', 0], ['fieldSpecs', 2]], xenaFieldPaths({
				fetchType: 'composite',
				fieldSpecs: [{
					fetchType: 'xena'
				}, {
					fetchType: 'composite',
					fieldSpecs: [{
						fetchType: 'xena'
					}]
				}, {
					fetchType: 'xena'
				}]
			}));
		});
	});
	describe('updateFields', function () {
		it('update top-level xena field', function () {
			assert.deepEqual({
				fetchType: 'xena',
				fields: ['FOO']
			}, updateFields({
				fetchType: 'xena',
				fields: ['foo']
			}, [[]], [['FOO']]));
		});
		it('update composite field', function () {
			assert.deepEqual({
				fetchType: 'composite',
				fieldSpecs: [{
					fetchType: 'xena',
					fields: ['FOO']
				}],
				fields: ['bar']
			}, updateFields({
				fetchType: 'composite',
				fieldSpecs: [{
					fetchType: 'xena',
					fields: ['foo']
				}],
				fields: ['bar']
			}, [['fieldSpecs', 0]], [['FOO']]));
		});
	});
});
