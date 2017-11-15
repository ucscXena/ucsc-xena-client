/*global require: false, it: false, console: false, describe: false, mocha: false */
'use strict';

var _ = require('../js/underscore_ext');
var {isObject, isNumber, isArray, getIn, get, every, pluck} =
	require('../js/underscore_ext');
var fetch = require('../js/fieldFetch');
require('../js/models/denseMatrix');
require('../js/models/datasetJoins');
var Rx = require('../js/rx');

var assert = require('assert');

var AGenomicDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.ACC.sampleMap/HumanMethylation450'
});

var AClinicalDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.BRCA.sampleMap/BRCA_clinicalMatrix'
});

var BClinicalDsID = JSON.stringify({
	'host': 'https:ucscpublic.xenahubs.net',
	'name': 'balagurunathan2008_public/balagurunathan2008_public_clinicalMatrix'
});

var AMutationDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.BRCA.sampleMap/mutation_wustl'
});

var BGenomicDsID = JSON.stringify({
	'host': 'https:ucscpublic.xenahubs.net',
	'name': 'balagurunathan2008_public/balagurunathan2008_genomicMatrix'
});

var CGenomicDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.KIRC.sampleMap/HiSeqV2_exon'
});

var ASecondGenomicDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.BRCA.sampleMap/HiSeqV2_exon'
});

var CMutationDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.KIRC.sampleMap/mutation'
});


var ASamples = [
	'TCGA-OR-A5LT-01',
	'TCGA-OR-A5LO-01',
	'TCGA-OR-A5JQ-01',
	'TCGA-OR-A5KY-01',
	'TCGA-PK-A5HC-01',
	'TCGA-OR-A5J4-01',
	'TCGA-OR-A5J8-01',
	'TCGA-OR-A5LH-01',
	'TCGA-OR-A5LF-01'];

var BSamples = [
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

var CSamples = [
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

fetch.add('debug', column => Rx.Observable.of(column.data), Rx.Scheduler.asap);

function isNumOrNull(x) {
	return isNumber(x) || x == null;
}

// Better stack trace, which halts the runner. Don't commit this!
//mocha.allowUncaught();

function logError(err) {
	console.log(err.stack);
	return err;
}

var validateSingleValueData = _.curry((samples, data) => {
	var fieldValues = getIn(data, ['req', 'values', 0]);
	assert(isArray(fieldValues), 'field data is array');
	assert(every(fieldValues, isNumOrNull), 'values are numbers');
	assert.equal(fieldValues.length, _.sum(_.pluck(samples, 'length')), 'length matches samples');
	assert(isNumber(getIn(data, ['req', 'mean', 0])), 'mean is a number');
});

var validateProbesData = _.curry((samples, data) => {
	var probes = getIn(data, ['req', 'probes']);
	assert(isArray(probes));
	probes.forEach((probe, i) => {
		var fieldValues = getIn(data, ['req', 'values', i]);
		assert(isArray(fieldValues), 'field is array');
		assert(every(fieldValues, isNumOrNull), 'values are numbers');
		assert.equal(fieldValues.length, _.sum(_.pluck(samples, 'length')), 'length matches samples');
		assert(isNumber(getIn(data, ['req', 'mean', i])), 'mean is number');
	});
});

var validateCodedData = _.curry((samples, data) => {
	var fieldValues = getIn(data, ['req', 'values', 0]);
	assert(isArray(fieldValues), 'field is array');
	assert(every(fieldValues, isNumOrNull), 'values are numbers');
	assert.equal(fieldValues.length, _.sum(_.pluck(samples, 'length')), 'length matches samples');
	assert(isArray(get(data, 'codes')), 'codes is array');
});

describe('fieldFetch', function () {
	this.timeout(10000);
	it('should fetch probe', function (done) {
		var probe = 'chr10_100010855_100011423';
		fetch(
		{
			fetchType: 'xena',
			dsID: AGenomicDsID,
			fieldType: 'probes',
			valueType: 'float',
			fields: [probe]
		}, [ASamples]).do(validateSingleValueData([ASamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene average', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: AGenomicDsID,
			fieldType: 'genes',
			valueType: 'float',
			fields: [field]
		}, [ASamples]).do(validateSingleValueData([ASamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch gene probes', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: AGenomicDsID,
			fieldType: 'geneProbes',
			valueType: 'float',
			fields: [field]
		}, [ASamples]).do(validateProbesData([ASamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical coded', function (done) {
		var field = 'additional_pharmaceutical_therapy';
		fetch(
		{
			fetchType: 'xena',
			dsID: AClinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field]
		}, [ASamples]).do(validateCodedData([ASamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch clinical float', function (done) {
		var field = 'age_at_initial_pathologic_diagnosis';
		fetch(
		{
			fetchType: 'xena',
			dsID: AClinicalDsID,
			fieldType: 'clinical',
			valueType: 'float',
			fields: [field]
		}, [ASamples]).do(validateSingleValueData([ASamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should fetch mutation', function (done) {
		var field = 'TP53';
		fetch(
		{
			fetchType: 'xena',
			dsID: AMutationDsID,
			fieldType: 'mutation',
			valueType: 'mutation',
			fields: [field],
			assembly: 'hg19'
		}, [ASamples]).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]),
				inSamples = s => s >= 0 && s < ASamples.length;

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
				dsID: AGenomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe0]
			}, {
				fetchType: 'xena',
				dsID: BGenomicDsID,
				fieldType: 'probes',
				valueType: 'float',
				fields: [probe1]
			}]
		}, [ASamples, BSamples]).do(validateSingleValueData([ASamples, BSamples]))
		.subscribe(() => done(), e => done(logError(e)));
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
				dsID: AGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: BGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field]
			}]
		}, [ASamples, BSamples]).do(validateSingleValueData([ASamples, BSamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose multiple gene floats', function (done) {
		var field0 = 'TP53',
			field1 = 'PTEN';
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'genes',
			valueType: 'float',
			fields: [field0, field1],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: AGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field0, field1]
			}, {
				fetchType: 'xena',
				dsID: BGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field0]
			}]
		}, [ASamples, BSamples]).do(data => {
			var fields = [field0, field1];
			fields.forEach((field, i) => {
				var fieldValues = getIn(data, ['req', 'values', i]);
				assert(isArray(fieldValues), 'field is array');
				assert(every(fieldValues, isNumOrNull), 'values are numbers');
				assert.equal(fieldValues.length, _.sum(_.pluck([ASamples, BSamples], 'length')), 'length matches samples');
				assert(isNumber(getIn(data, ['req', 'mean', i])), 'mean is number');
			});
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
				dsID: ASecondGenomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}, {
				fetchType: 'xena',
				dsID: CGenomicDsID,
				fieldType: 'geneProbes',
				valueType: 'float',
				fields: [field]
			}]
		}, [ASamples, CSamples]).do(validateProbesData([ASamples, CSamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose clinical coded', function (done) {
		var field0 = 'AJCC_Stage_nature2012',
			field1 = 'Tissue';
		fetch(
		{
			fetchType: 'composite',
			dsID: AClinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field0],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: AClinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field0]
			}, {
				fetchType: 'xena',
				dsID: BClinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field1]
			}]
		}, [ASamples, BSamples]).do(validateCodedData([ASamples, BSamples]))
		.subscribe(() => done(), e => done(logError(e)));
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
				dsID: AMutationDsID,
				fieldType: 'mutation',
				valueType: 'mutation',
				fields: [field],
				assembly: 'hg19',
			}, {
				fetchType: 'xena',
				dsID: CMutationDsID,
				fieldType: 'mutation',
				valueType: 'mutation',
				fields: [field],
				assembly: 'hg19',
			}]
		}, [ASamples, CSamples]).do(data => {
			var rows = getIn(data, ['req', 'rows']),
				samplesInResp = getIn(data, ['req', 'samplesInResp']),
				refGene = getIn(data, ['refGene', field]),
				count = ASamples.length + CSamples.length,
				inSamples = s => s >= 0 && s < count;

			assert(isArray(rows), 'rows is an array');
			assert(isArray(samplesInResp), 'samplesInResp is an array');
			assert(every(pluck(rows, 'sample'), s => inSamples(s)), 'all samples are in sample list');
			assert(isObject(refGene), 'refGene is an object');
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose float with coded', function (done) {
		var field0 = 'AJCC_Stage_nature2012',
			field1 = 'TP53';
		fetch(
		{
			fetchType: 'composite',
			dsID: AClinicalDsID,
			fieldType: 'clinical',
			valueType: 'coded',
			fields: [field0],
			fieldSpecs: [{
				fetchType: 'xena',
				dsID: AClinicalDsID,
				fieldType: 'clinical',
				valueType: 'coded',
				fields: [field0]
			}, {
				fetchType: 'xena',
				dsID: BGenomicDsID,
				fieldType: 'genes',
				valueType: 'float',
				fields: [field1]
			}]
		}, [ASamples, BSamples]).do(validateCodedData([ASamples, BSamples]))
		.subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose coded #2', function (done) {
		var ASamples = ['sA', 'sB', 'sC', 'sD'],
			BSamples = ['sa', 'sb'],
			exp = {
				req: {
					values: [[2, 3, 4, 5, 0, 1]]
				},
				codes: ['A', 'B', 'a', 'b', 'c', 'd']
			};
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'clinical',
			valueType: 'coded',
			fields: ['field0'],
			fieldSpecs: [{
				fetchType: 'debug',
				data: {
					req: {
						values: [[0, 1, 2, 3]]
					},
					codes: ['a', 'b', 'c', 'd']
				},
				fieldType: 'clinical',
				valueType: 'coded',
				fields: ['field0']
			}, {
				fetchType: 'debug',
				data: {
					req: {
						values: [[0, 1]]
					},
					codes: ['A', 'B']
				},
				fieldType: 'clinical',
				valueType: 'coded',
				fields: ['field1']
			}]
		}, [ASamples, BSamples]).do(data => {
			assert.deepEqual(data, exp, `${JSON.stringify(data)} != ${JSON.stringify(exp)}`);
		}).subscribe(() => done(), e => done(logError(e)));
	});
	it('should compose coded #3', function (done) {
		var ASamples = ['sC', 'sD', 'sA', 'sB'],
			exp = {
				req: {
					values: [[2, 3, 0, 1]]
				},
				codes: ['5', '4', '3', '2', '1']
			};
		fetch(
		{
			fetchType: 'composite',
			fieldType: 'clinical',
			valueType: 'coded',
			fields: ['field0'],
			fieldSpecs: [{
				fetchType: 'debug',
				data: {
					req: {
						values: [[2, 3, 0, 1]]
					},
					codes: ['5', '4', '3', '2', '1']
				},
				fieldType: 'clinical',
				valueType: 'coded',
				fields: ['field0']
			}]
		}, [ASamples]).do(data => {
			// important point is that code order is preserved
			assert.deepEqual(data, exp, `${JSON.stringify(data)} != ${JSON.stringify(exp)}`);
		}).subscribe(() => done(), e => done(logError(e)));
	});
});
