/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

var Rx = require('rx');
var {isObject, isNumber, isArray, getIn, every, values, keys, contains, pluck} =
	require('../js/underscore_ext');
//var mocha = require('mocha');
//var {fetch} = require('../js/columnWidgets');
var fetch = require('../js/fieldFetch');
require('../js/models/denseMatrix');

var assert = require('assert');

var genomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/SNP6.matrix'
});

var clinicalDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/BRCA_clinicalMatrix'
});

var mutationDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/mutation_unc'
});


var samples = [
	"TCGA-GI-A2C8-01",
	'TCGA-EW-A424-01',
	'TCGA-AC-A23E-01',
	'TCGA-D8-A147-01',
	'TCGA-E2-A150-01',
	'TCGA-E2-A14O-01',
	'TCGA-A2-A04R-01',
	'TCGA-E9-A245-01',
	'TCGA-C8-A1HJ-01'];

function isNumOrNull(x) {
	return isNumber(x) || x == null;
}

Rx.config.longStackSupport = true;

//mocha.allowUncaught();

function logError(err) {
	console.log(err.stack);
	return err;
}

describe('xena fetch', function () {
	it('should fetch probe', function (done) {
		var probe = 'chr10_100010855_100011423';
		fetch(
		{
			fetchType: 'xena',
			dsID: genomicDsID,
			fieldType: 'probes',
			valueType: 'float',
			fields: [probe]
		}, samples).do(data => {
			var probeValues = getIn(data, ['req', 'values', probe]);
			assert(isObject(probeValues));
			assert(every(values(probeValues), isNumOrNull));
			assert(every(keys(probeValues), k => contains(samples, k)));
			assert(isNumber(getIn(data, ['req', 'mean', probe])));
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene average', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: genomicDsID,
			fieldType: 'genes',
			valueType: 'float',
			fields: [field]
		}, samples).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isObject(fieldValues));
			assert(every(values(fieldValues), isNumOrNull));
			assert(every(keys(fieldValues), k => contains(samples, k)));
			assert(isNumber(getIn(data, ['req', 'mean', field])));
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene probes', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: genomicDsID,
			fieldType: 'geneProbes',
			valueType: 'float',
			fields: [field]
		}, samples).do(data => {
			var probes = getIn(data, ['req', 'probes']);
			assert(isArray(probes));
			probes.forEach(probe => {
				var fieldValues = getIn(data, ['req', 'values', probe]);
				assert(isObject(fieldValues));
				assert(every(values(fieldValues), isNumOrNull));
				assert(every(keys(fieldValues), k => contains(samples, k)));
				assert(isNumber(getIn(data, ['req', 'mean', probe])));
			});
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical coded', function (done) {
		var field = 'additional_pharmaceutical_therapy';
		fetch(
		{
			fetchType: 'xena',
			dsID: clinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field]
		}, samples).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isObject(fieldValues));
			assert(every(values(fieldValues), isNumOrNull));
			assert(every(keys(fieldValues), k => contains(samples, k)));
			assert(isNumber(getIn(data, ['req', 'mean', field])));
			assert(isArray(getIn(data, ['codes', field])));
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical float', function (done) {
		var field = 'age_at_initial_pathologic_diagnosis';
		fetch(
		{
			fetchType: 'xena',
			dsID: clinicalDsID,
			fieldType: 'clinical',
			valueType: 'float',
			fields: [field]
		}, samples).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isObject(fieldValues));
			assert(every(values(fieldValues), isNumOrNull));
			assert(every(keys(fieldValues), k => contains(samples, k)));
			assert(isNumber(getIn(data, ['req', 'mean', field])));
			assert(getIn(data, ['codes', field]) == null);
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch mutation', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: mutationDsID,
			fieldType: 'mutation',
			valueType: 'mutation',
			fields: [field],
			assembly: 'hg19'
		}, samples).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]);

			assert(isArray(rows));
			assert(isArray(samplesInResp));
			assert(every(pluck(rows, 'sample'), s => contains(samples, s)));
			assert(isObject(refGene));
		}).subscribe(() => done(), e => done(logError(e)));
	});
});
