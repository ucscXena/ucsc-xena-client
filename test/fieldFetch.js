/*global require: false, it: false, console: false, describe: false, mocha: false */

var _ = require('../js/underscore_ext');
var {isObject, isNumber, isArray, getIn, get, every, pluck} =
	require('../js/underscore_ext');
var fetch = require('../js/fieldFetch');
require('../js/models/denseMatrix');
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

//var BClinicalDsID = JSON.stringify({
//	'host': 'https:ucscpublic.xenahubs.net',
//	'name': 'balagurunathan2008_public/balagurunathan2008_public_clinicalMatrix'
//});

var AMutationDsID = JSON.stringify({
	'host': 'https:tcga.xenahubs.net',
	'name': 'TCGA.BRCA.sampleMap/mutation_wustl'
});

//var BGenomicDsID = JSON.stringify({
//	'host': 'https:ucscpublic.xenahubs.net',
//	'name': 'balagurunathan2008_public/balagurunathan2008_genomicMatrix'
//});
//
//var CGenomicDsID = JSON.stringify({
//	'host': 'https:tcga.xenahubs.net',
//	'name': 'TCGA.KIRC.sampleMap/HiSeqV2_exon'
//});
//
//var ASecondGenomicDsID = JSON.stringify({
//	'host': 'https:tcga.xenahubs.net',
//	'name': 'TCGA.BRCA.sampleMap/HiSeqV2_exon'
//});
//
//var CMutationDsID = JSON.stringify({
//	'host': 'https:tcga.xenahubs.net',
//	'name': 'TCGA.KIRC.sampleMap/mutation'
//});


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

//var BSamples = [
//	'TumPancM11',
//	'NormStomach1',
//	'NormMonocyte12',
//	'NormAstrocytoma1',
//	'TumPancM20',
//	'NormMelanocyte',
//	'NormLung2',
//	'NormLung3',
//	'TumPancM1',
//	'TumPancM2',
//	'TumPancM3',
//	'TumPancM4',
//	'NormBrain',
//	'NormOsteoblast'];
//
//var CSamples = [
//	'TCGA-B4-5844-01',
//	'TCGA-CZ-5459-01',
//	'TCGA-B0-4694-01',
//	'TCGA-BP-4965-01',
//	'TCGA-B4-5836-01',
//	'TCGA-A3-3335-01',
//	'TCGA-B2-4102-01',
//	'TCGA-BP-4167-01',
//	'TCGA-BP-4995-01',
//	'TCGA-AK-3434-01',
//	'TCGA-B4-5377-01',
//	'TCGA-BP-4960-01',
//	'TCGA-A3-3382-01',
//	'TCGA-A3-3331-01',
//	'TCGA-B0-4690-01',
//	'TCGA-CZ-5466-01'];

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
		}, ASamples).do(validateSingleValueData([ASamples]))
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
		}, ASamples).do(validateSingleValueData([ASamples]))
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
		}, ASamples).do(validateProbesData([ASamples]))
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
		}, ASamples).do(validateCodedData([ASamples]))
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
		}, ASamples).do(validateSingleValueData([ASamples]))
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
		}, ASamples).do(data => {
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
});
