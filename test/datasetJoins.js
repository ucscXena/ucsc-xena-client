/*global require: false, module: false, console: false, describe: false */
'use strict';

var assert = require('assert');
var jv = require('jsverify');
var _ = require('../js/underscore_ext');
var {getColSpec} = require('../js/models/datasetJoins');

describe('datasetJoins', function () {
	describe('getColSpec', function () {
		var {suchthat, constant, asciinestring, oneof, nearray, tuple} = jv;
		{
			let someGenes = fields => _.some(fields, ([type]) => type === 'genes');
			let fieldTypes = ['genes', 'geneProbes', 'null'].map(constant),
				typeDsID = tuple([oneof(fieldTypes), asciinestring]),
				typesPmap = tuple([suchthat(nearray(typeDsID), someGenes), asciinestring]);

			jv.property("defaults to genes with some 'genes' fields", typesPmap, function ([typesDsIDs, pmap]) {

				var fieldSpecs = typesDsIDs.map(([type, dsID]) => ({
						fields: ['foo'],
						fieldType: type,
						fetchType: type === 'null' ? 'null' : 'xena',
						...(type === 'null' ? null : {dsID})
					})),
					datasets = _.object(_.pluck(typesDsIDs, 1),
						_.times(typesDsIDs.length, _.constant({probemap: pmap})));
					var fs = getColSpec(fieldSpecs, datasets);

					assert.equal(fs.fieldType, 'genes');
					return true;
			});
		}
		{
			let someGeneProbes = fields => _.some(fields, ([type]) => type === 'geneProbes');
			let fieldTypes = ['geneProbes', 'null'].map(constant),
				typeDsID = tuple([oneof(fieldTypes), asciinestring]),
				typesPmap = tuple([suchthat(nearray(typeDsID), someGeneProbes), asciinestring]);

			jv.property('defaults to geneProbes with same probemap', typesPmap, function ([typesDsIDs, pmap]) {
				var fieldSpecs = typesDsIDs.map(([type, dsID]) => ({
						fields: ['foo'],
						fieldType: type,
						fetchType: type === 'null' ? 'null' : 'xena',
						...(type === 'null' ? null : {dsID})
					})),
					datasets = _.object(_.pluck(typesDsIDs, 1),
						_.times(typesDsIDs.length, _.constant({probemap: pmap})));
					var fs = getColSpec(fieldSpecs, datasets);

					assert.equal(fs.fieldType, 'geneProbes');
					return true;
			});
		}
		{
			let twoGeneProbes = fields => _.filter(fields, ([type]) => type === 'geneProbes').length >= 2;
			let diffProbemaps = fields => _.uniq(_.pluck(fields, 1)).length === fields.length;
			let fieldTypes = ['geneProbes', 'null'].map(constant),
				typeDsID = tuple([oneof(fieldTypes), asciinestring, asciinestring]),
				fields = suchthat(nearray(typeDsID), fds => twoGeneProbes(fds) && diffProbemaps(fds));

			// test: genes/geneProbes, probemap = or !=, fields > 1 or = 1
			// For any combination of genes, geneProbes, null, getColSpec should
			// set to geneProbes if probemaps match, and to genes if they don't.
			//
			// To test, we want a set of fieldSpec, at least one of type 'genes'.
			jv.property('defaults to genes with same different probemap', fields, function (typesDsIDsPmaps) {
				var fieldSpecs = typesDsIDsPmaps.map(([type, dsID]) => ({
						fields: ['foo'],
						fieldType: type,
						fetchType: type === 'null' ? 'null' : 'xena',
						...(type === 'null' ? null : {dsID})
					})),
					datasets = _.object(_.map(typesDsIDsPmaps, ([, dsID, pmap]) => [dsID, {probemap: pmap}]));
					var fs = getColSpec(fieldSpecs, datasets);

					assert.equal(fs.fieldType, 'genes');
					return true;
			});
		}

		return true;
	});
});
