/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

//var _ = require('../js/underscore_ext');
var {xenaFieldPaths, updateFields, setFieldType} = require('../js/models/fieldSpec');

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
	describe('setFieldType', function () {
		it('should set xena fieldType', function () {
			assert.deepEqual({
				fetchType: 'xena',
				fieldType: 'geneProbes',
				fields: ['foo']
			}, setFieldType('geneProbes', {
				fetchType: 'xena',
				fieldType: 'genes',
				fields: ['foo']
			}));
		});
		it('should ignore null fieldType', function () {
			assert.deepEqual({
				fetchType: 'null',
				fieldType: 'null'
			}, setFieldType('geneProbes', {
				fetchType: 'null',
				fieldType: 'null'
			}));
		});
		it('should set composite fieldType', function () {
			assert.deepEqual({
				fetchType: 'composite',
				fieldType: 'geneProbes',
				fieldSpecs: [{
					fetchType: 'xena',
					fieldType: 'geneProbes',
					fields: ['tp53']
				}, {
					fetchType: 'null',
					fieldType: 'null'
				}, {
					fetchType: 'xena',
					fieldType: 'geneProbes',
					fields: ['foxm1']
				}]
			}, setFieldType('geneProbes', {
				fetchType: 'composite',
				fieldType: 'genes',
				fieldSpecs: [{
					fetchType: 'xena',
					fieldType: 'genes',
					fields: ['tp53']
				}, {
					fetchType: 'null',
					fieldType: 'null'
				}, {
					fetchType: 'xena',
					fieldType: 'genes',
					fields: ['foxm1']
				}]
			}));
		});
	});
});
