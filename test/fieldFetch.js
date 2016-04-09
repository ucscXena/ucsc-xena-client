/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

var Rx = require('rx');
var {isObject, isNumber, isArray, getIn, every, pluck} =
	require('../js/underscore_ext');
var fetch = require('../js/fieldFetch');
require('../js/models/denseMatrix');
require('../js/models/datasetJoins');

var assert = require('assert');

var A_genomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/SNP6.matrix'
});

var A_clinicalDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/BRCA_clinicalMatrix'
});

var B_clinicalDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'other/balagurunathan2008_public/balagurunathan2008_public_clinicalMatrix'
});

var A_mutationDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/mutation_unc'
});

var B_genomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'other/balagurunathan2008_public/balagurunathan2008_genomicMatrix'
});

var C_genomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.KIRC.sampleMap/HiSeqV2_exon'
});

var A_secondGenomicDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.BRCA.sampleMap/HiSeqV2_exon'
});

var C_mutationDsID = JSON.stringify({
	'host': 'https://genome-cancer.ucsc.edu:443/proj/public/xena',
	'name': 'TCGA/TCGA.KIRC.sampleMap/mutation'
});

var A_samples = [
	"TCGA-GI-A2C8-01",
	'TCGA-EW-A424-01',
	'TCGA-AC-A23E-01',
	'TCGA-D8-A147-01',
	'TCGA-E2-A150-01',
	'TCGA-E2-A14O-01',
	'TCGA-A2-A04R-01',
	'TCGA-E9-A245-01',
	'TCGA-C8-A1HJ-01'];

var B_samples = [
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

var C_samples = [
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
	this.timeout(5000);
	it('should fetch probe', function (done) {
		var probe = 'chr10_100010855_100011423';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_genomicDsID,
			fieldType: 'probes',
			valueType: 'float',
			fields: [probe]
		}, [A_samples]).do(data => {
			var probeValues = getIn(data, ['req', 'values', probe]);
			assert(isArray(probeValues), 'probe is array');
			assert(every(probeValues, isNumOrNull), 'values are numbers');
			assert(isNumber(getIn(data, ['req', 'mean', probe])), 'mean is a number');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene average', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_genomicDsID,
			fieldType: 'genes',
			valueType: 'float',
			fields: [field]
		}, [A_samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues), 'field is array');
			assert(every(fieldValues, isNumOrNull), 'values are numbers');
			assert(isNumber(getIn(data, ['req', 'mean', field])), 'mean is number');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene probes', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_genomicDsID,
			fieldType: 'geneProbes',
			valueType: 'float',
			fields: [field]
		}, [A_samples]).do(data => {
			var probes = getIn(data, ['req', 'probes']);
			assert(isArray(probes));
			probes.forEach(probe => {
				var fieldValues = getIn(data, ['req', 'values', probe]);
				assert(isArray(fieldValues), 'field is array');
				assert(every(fieldValues, isNumOrNull), 'values are numbers');
				assert(isNumber(getIn(data, ['req', 'mean', probe])), 'mean is number');
			});
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical coded', function (done) {
		var field = 'additional_pharmaceutical_therapy';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_clinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field]
		}, [A_samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues), 'field is array');
			assert(every(fieldValues, isNumOrNull), 'values are numbers');
			// XXX why check for mean on a coded field?
			assert(isNumber(getIn(data, ['req', 'mean', field])), 'mean is number');
			assert(isArray(getIn(data, ['codes', field])), 'codes is array');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical float', function (done) {
		var field = 'age_at_initial_pathologic_diagnosis';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_clinicalDsID,
			fieldType: 'clinical',
			valueType: 'float',
			fields: [field]
		}, [A_samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field]);
			assert(isArray(fieldValues), 'field is array');
			assert(every(fieldValues, isNumOrNull), 'values are numbers');
			assert(isNumber(getIn(data, ['req', 'mean', field])), 'mean is number');
			assert(getIn(data, ['codes', field]) == null, 'codes is null');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch mutation', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: A_mutationDsID,
			fieldType: 'mutation',
			valueType: 'mutation',
			fields: [field],
			assembly: 'hg19'
		}, [A_samples]).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]),
				inSamples = s => s >= 0 && s < A_samples.length;

			assert(isArray(rows), 'rows is array');
			assert(isArray(samplesInResp), 'samplesInResp is array');
			assert(every(pluck(rows, 'sample'), s => inSamples(s)), 'samples are in list');
			assert(isObject(refGene), 'refGene is object');
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
				dsID: A_genomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe0]
			}, {
				fetchType: 'xena',
				dsID: B_genomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe1]
			}]
		}, [A_samples, B_samples]).do(data => {
			var probeValues = getIn(data, ['req', 'values', probe0]);
			assert(isArray(probeValues), 'probe is array');
			assert(every(probeValues, isNumOrNull), 'values are numbers');
			assert.equal(probeValues.length, A_samples.length + B_samples.length);
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
				dsID: A_genomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: B_genomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}]
		}, [A_samples, B_samples]).do(data => {
			var geneValues = getIn(data, ['req', 'values', field]);
			assert(isArray(geneValues), 'gene is array');
			assert(every(geneValues, isNumOrNull), 'values are numbers');
			assert.equal(geneValues.length, A_samples.length + B_samples.length);
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
				dsID: A_secondGenomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: C_genomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}]
		}, [A_samples, C_samples]).do(data => {
			var probes = getIn(data, ['req', 'probes']);
			assert(isArray(probes));
			probes.forEach(probe => {
				var fieldValues = getIn(data, ['req', 'values', probe]);
				assert(isArray(fieldValues), 'probe is array');
				assert(every(fieldValues, isNumOrNull), 'values are numbers');
				assert.equal(fieldValues.length, A_samples.length + C_samples.length, 'length matches samples');
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
			dsID: A_clinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field0],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: A_clinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field0]
			}, {
				fetchType: 'xena',
				dsID: B_clinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field1]
			}]
		}, [A_samples, B_samples]).do(data => {
			var fieldValues = getIn(data, ['req', 'values', field0]);
			assert(isArray(fieldValues), 'field is array');
			assert(every(fieldValues, isNumOrNull), 'values are numbers');
			assert.equal(fieldValues.length, A_samples.length + B_samples.length, 'length matches A_samples');
			assert(isArray(getIn(data, ['codes', field0])), 'codes is array');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose mutation', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'mutation',
			valueType: 'mutation',
			fields: [field],
			assembly: 'hg19',
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: A_mutationDsID,
				fieldType: 'mutation',
				valueType: 'mutation',
				fields: [field],
				assembly: 'hg19',
			}, {
				fetchType: 'xena',
				dsID: C_mutationDsID,
				fieldType: 'mutation',
				valueType: 'mutation',
				fields: [field],
				assembly: 'hg19',
			}]
		}, [A_samples, C_samples]).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]),
				count = A_samples.length + C_samples.length,
				inSamples = s => s >= 0 && s < count;

			assert(isArray(rows), 'rows is an array');
			assert(isArray(samplesInResp), 'samplesInResp is an array');
			assert(every(pluck(rows, 'sample'), s => inSamples(s)), 'all samples are in sample list');
			assert(isObject(refGene), 'refGene is an object');
		}).subscribe(() => done(), e => done(logError(e)));
	});
});
