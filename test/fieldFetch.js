/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

var Rx = require('rx');
var {isObject, isNumber, isArray, getIn, every, contains, pluck} =
	require('../js/underscore_ext');
//var mocha = require('mocha');
//var {fetch} = require('../js/columnWidgets');
var fetch = require('../js/fieldFetch');
require('../js/models/denseMatrix');
require('../js/models/datasetJoins');

var assert = require('assert');

var genomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/SNP6.matrix'
});

var clinicalDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/BRCA_clinicalMatrix'
});

var secondClinicalDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'other/balagurunathan2008_public/balagurunathan2008_public_clinicalMatrix'
});

var mutationDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/mutation_unc'
});

var secondGenomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'other/balagurunathan2008_public/balagurunathan2008_genomicMatrix'
});

var thirdGenomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.KIRC.sampleMap/HiSeqV2_exon'
});

var forthGenomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/HiSeqV2_exon'
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

var secondSamples = [
	'TumPancM11',
	'NormStomach1',
	'NormMonocyte12',
	'NormAstrocytoma1',
	'TumPancM20',
	'NormMelanocyte',
	'NormLung2',
	'NormLung3',
	'TumPancM1',
	'TumPancM2',
	'TumPancM3',
	'TumPancM4',
	'NormBrain',
	'NormOsteoblast'];

var thirdSamples = [
	'TCGA-B4-5844-01',
	'TCGA-CZ-5459-01',
	'TCGA-B0-4694-01',
	'TCGA-BP-4965-01',
	'TCGA-B4-5836-01',
	'TCGA-A3-3335-01',
	'TCGA-B2-4102-01',
	'TCGA-BP-4167-01',
	'TCGA-BP-4995-01',
	'TCGA-AK-3434-01',
	'TCGA-B4-5377-01',
	'TCGA-BP-4960-01',
	'TCGA-A3-3382-01',
	'TCGA-A3-3331-01',
	'TCGA-B0-4690-01',
	'TCGA-CZ-5466-01'];

var forthSamples = samples;

function isNumOrNull(x) {
	return isNumber(x) || x == null;
}

Rx.config.longStackSupport = true;

mocha.allowUncaught();

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
		}, [samples]).do(data => {
			var probeValues = getIn(data, ['req', 'values', probe]);
			assert(isArray(probeValues));
			assert(every(probeValues, isNumOrNull));
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
		}, [samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues));
			assert(every(fieldValues, isNumOrNull));
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
		}, [samples]).do(data => {
			var probes = getIn(data, ['req', 'probes']);
			assert(isArray(probes));
			probes.forEach(probe => {
				var fieldValues = getIn(data, ['req', 'values', probe]);
				assert(isArray(fieldValues));
				assert(every(fieldValues, isNumOrNull));
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
		}, [samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues));
			assert(every(fieldValues, isNumOrNull));
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
		}, [samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues));
			assert(every(fieldValues, isNumOrNull));
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
		}, [samples]).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]);

			assert(isArray(rows));
			assert(isArray(samplesInResp));
			assert(every(pluck(rows, 'sample'), s => contains(samples, s)));
			assert(isObject(refGene));
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose probe floats', function (done) {
		var probe0 = 'chr10_100010855_100011423',
			probe1 = 'A_23_P100001';
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'probes',
			valueType: 'float',
			fields: [probe0],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: genomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe0]
			}, {
				fetchType: 'xena',
				dsID: secondGenomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe1]
			}]
		}, [samples, secondSamples]).do(data => {
			var probeValues = getIn(data, ['req', 'values', probe0]);
			assert(isArray(probeValues), 'probe is array');
			assert(every(probeValues, isNumOrNull), 'values are numbers');
			assert.equal(probeValues.length, samples.length + secondSamples.length);
			assert(isNumber(getIn(data, ['req', 'mean', probe0])), 'mean is number');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose gene floats', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'genes',
			valueType: 'float',
			fields: [field],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: genomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: secondGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}]
		}, [samples, secondSamples]).do(data => {
			var geneValues = getIn(data, ['req', 'values', field]);
			assert(isArray(geneValues), 'gene is array');
			assert(every(geneValues, isNumOrNull), 'values are numbers');
			assert.equal(geneValues.length, samples.length + secondSamples.length);
			assert(isNumber(getIn(data, ['req', 'mean', field])), 'mean is number');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose gene probe floats', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'geneProbes',
			valueType: 'float',
			fields: [field],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: forthGenomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: thirdGenomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}]
		}, [forthSamples, thirdSamples]).do(data => {
			var probes = getIn(data, ['req', 'probes']);
			assert(isArray(probes));
			probes.forEach(probe => {
				var fieldValues = getIn(data, ['req', 'values', probe]);
				assert(isArray(fieldValues), 'probe is array');
				assert(every(fieldValues, isNumOrNull), 'values are numbers');
				assert.equal(fieldValues.length, forthSamples.length + thirdSamples.length, 'length matches samples');
				assert(isNumber(getIn(data, ['req', 'mean', probe])), 'mean is number');
			});
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose clinical coded', function (done) {
		var field0 = 'AJCC_Stage_nature2012',
			field1 = 'Tissue';
		fetch(
		{
			fetchType: 'composite',
			dsID: clinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field0],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: clinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field0]
			}, {
				fetchType: 'xena',
				dsID: secondClinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field1]
			}]
		}, [samples, secondSamples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field0]);
			assert(isArray(fieldValues), 'field is array');
			assert(every(fieldValues, isNumOrNull), 'values are numbers');
			assert.equal(fieldValues.length, samples.length + secondSamples.length, 'length matches samples');
			assert(isArray(getIn(data, ['codes', field0])), 'codes is array');
		}).subscribe(() => done(), e => done(logError(e)));
	});
});
