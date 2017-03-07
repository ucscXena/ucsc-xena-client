/*eslint camelcase: 0, no-multi-spaces: 0, no-mixed-spaces-and-tabs: 0 */

'use strict';

var Rx = require('./rx');
var _ = require('./underscore_ext');
var {permuteCase, permuteBitCount} = require('./permuteCase');
// Load all query files as a map of strings.
var qs = require('val!./loadXenaQueries');

///////////////////////////////////////////////////////
// support for hg18/GRCh36, hg19/GRCh37, hg38/GRCh38
var refGene = {
	hg18: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	GRCh36: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	hg19: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'},
	GRCh37: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'},
	hg38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'},
	GRCh38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'}
};

var transcript = {
	hg18: {host: 'https://reference.xenahubs.net', name: 'refGene_hg18'},
	GRCh36: {host: 'https://reference.xenahubs.net', name: 'refGene_hg18'},
	hg19: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasic_hg19'},
	GRCh37: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasic_hg19'},
	hg38: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasic_hg38'},
	GRCh38: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasic_hg38'}
};

///////////////////////////////////////////////////////
// Serialization helpers

var jsonResp = xhr => xhr.response;

var quote = s => s == null ? 'nil' : ('"' + s + '"'); // XXX should escape "

var sep = l => _.map(l, quote).join(' ');

var arrayfmt = l => '[' + sep(l) + ']';

var nanstr = v => isNaN(v) ? null : v;

///////////////////////////////////////////////////////

function parseDsID(dsID) {
	var {host, name} = JSON.parse(dsID);
	return [host, name];
}

var isDsID = x => x[0] === '{';

// Transform a function taking initial parameters (host, dataset, ...) to
// optionally take (dsID, ...) instead. Uses a heuristic check for dsID,
// and marshalls the parameters as necessary.
var dsIDFn = fn =>
	(hostOrDsID, ...args) =>
		isDsID(hostOrDsID) ?
			fn(...parseDsID(hostOrDsID), ...args) :
			fn(hostOrDsID, ...args);

///////////////////////////////////////////////////////
// Transforms of responses from the xena server.

function indexFeatures(features) {
	return _.object(_.map(features, function (f) {
		return [f.name, f.longtitle || f.name];
	}));
}

function indexCodes(codes) {
	return _.object(_.map(codes, function (row) {
		return [row.name, row.code && row.code.split('\t')];
	}));
}

function datasetListTransform(host, list) {
	return _.map(list, function (ds) {
		var text = JSON.parse(ds.text) || {},
			pmtext = ds.pmtext ? JSON.parse(ds.pmtext) : null;
		// merge curated fields over raw metadata
		// XXX note that we're case sensitive on raw metadata
		ds = _.extend(text, _.dissoc(ds, 'text'));
		return _.extend(ds, {
			dsID: JSON.stringify({host: host, name: ds.name}),
			label: ds.label || ds.name,
			probemapMeta: pmtext
		});
	});
}

// XXX Can't rewrite :samples in sparseData until we can do 'distinct', or 'keys' for category fields, on the server.

// XXX "position", "position (2)" is really horrible, in refGeneExons. Need
// better naming for position fields.  Might want to allow renaming fields,
// with [:old-name :new-name] Also, cds doesn't really need to be indexed.
// XXX Should we write a compact collection type, where columns are in typed
// arrays? Maybe with codes? Or run-length encoding?

function indexFeatureDetail(features) {
	return _.reduce(features, function (acc, row) {
		acc[row.name] = row;
		return acc;
	}, {});
}

function mutationAttrs(list) {
	return _.map(list, function (row) {
		return {
			"sample": row.sampleID,
			"chr": row.position.chrom,
			"start": row.position.chromstart,
			"end": row.position.chromend,
			"gene": row.genes[0],
			"reference": row.ref,
			"alt": row.alt,
			"altGene": row.altGene,
			"effect": row.effect,
			"aminoAcid": row['amino-acid'],
			"rnaVaf": nanstr(row['rna-vaf']),
			"dnaVaf": nanstr(row['dna-vaf'])
		};
	});
}

// {field: [value, ...], ...} -> [{field: value, ...}, ...]
function collateRows(rows) {
	var keys = _.keys(rows);
	return _.map(_.range(rows[keys[0]].length), i => _.object(keys, _.map(keys, k => rows[k][i])));
}

// {:sampleid ["id0", "id1", ...], chromstart: [123, 345...], ...}
function indexMutations(gene, resp) {
	// XXX The query for samples is returning every row in the dataset,
	// rather than distinct sampleIDs from the dataset. We need a
	// 'distinct' function for xena-query.
	var rows = mutationAttrs(collateRows(resp.rows));
	return {
		rows,
		samplesInResp: _.uniq(resp.samples) // XXX rename this after deprecating samples
	};
}

var segmentedAttrs = list =>
	_.map(list, row => ({
		"sample": row.sampleID,
		"start": row.position.chromstart,
		"end": row.position.chromend,
		"value": nanstr(row.value)
	}));

function indexSegmented(resp) {
	// XXX The query for samples is returning every row in the dataset,
	// rather than distinct sampleIDs from the dataset. We need a
	// 'distinct' function for xena-query.
	var rows = segmentedAttrs(collateRows(resp.rows));
	return {
		rows,
		samplesInResp: _.uniq(resp.samples) // XXX rename this after deprecating samples
	};
}

function alignMatches(input, matches) {
	var index = _.object(_.map(matches, g => g.toLowerCase()), matches);
	return _.map(input, g => index[g.toLowerCase()] || g);
}

function splitExon(s) {
	return _.map(s.replace(/,$/, '').split(','), _.partial(parseInt, _, 10));
}

function refGeneAttrs(row) {
	return {
		name2: row.name2[0],
		strand: row.position.strand,
		txStart: row.position.chromstart,
		txEnd: row.position.chromend,
		chrom: row.position.chrom,
		cdsStart: row['position (2)'].chromstart, // XXX ouch: position (2)
		cdsEnd: row['position (2)'].chromend,
		exonCount: row.exonCount,
		exonStarts: splitExon(row.exonStarts),
		exonEnds: splitExon(row.exonEnds)
	};
}

function indexRefGene(resp) {
	return _.object(resp.name2, _.map(collateRows(resp), refGeneAttrs));
}

////////////////////////////////////////////////////
// Query marshalling and dispatch

function xenaPost(host, query) {
	return {
		crossDomain: true,
		headers: {'Content-Type': 'text/plain' },
		url: host + '/data/',
		body: query,
		method: 'POST'
	};
}

function marshallParam(p) {
	if (_.isString(p)) {
		return quote(p);
	}
	if (_.isArray(p)) {
		// XXX Note this only works with string arrays.
		return arrayfmt(p);
	}
	return p == null ? 'nil' : p;
}

// marshall parameters and build the lisp call form
function xenaCall(queryFn, ...params) {
	return `(${queryFn} ${params.map(marshallParam).join(' ')})`;
}

// Given a host, query, and parameters, marshall the parameters and dispatch a
// POST, returning an observable.
function doPost(query, host, ...params) {
	return Rx.Observable.ajax(
		xenaPost(host, xenaCall(query, ...params))
	).map(jsonResp);
}

// Create POST methods for all of the xena queries.
var queryPosts = _.mapObject(qs, query =>
		(...args) => doPost(query, ...args));

////////////////////////////////////////////////////
// Extend POST methods
function transformPOSTMethods(postMethods) {
	// We frequently want to index or normalize the returned data. For the
	// common case where we only need to map a transform over the response,
	// this function will apply the transform mapFn to the POST method.
	var mapResponse = mapFn => postFn =>
		(...args) => postFn(...args).map(mapFn);


	// Transforms that we apply to the POST methods, to make them easier to use.
	var mapFns = {
		allFieldMetadata: mapResponse(indexFeatureDetail),
		featureList: mapResponse(indexFeatures),
		fieldCodes: mapResponse(indexCodes),
		fieldMetadata: mapResponse(indexFeatureDetail),
		refGeneExons: mapResponse(indexRefGene),
		segmentedDataRange: mapResponse(indexSegmented),
		// Apply a transform that requires the 'host' parameter
		datasetList: postFn => (host, cohort) =>
			postFn(host, cohort).map(resp => datasetListTransform(host, resp)),
		// Apply a transform that requires the 'host' parameter
		datasetMetadata: postFn => (host, dataset) =>
			postFn(host, dataset).map(resp => datasetListTransform(host, resp)),
		// Apply a transform that requires the 'gene' parameter
		sparseData: postFn => (host, dataset, gene, samples) =>
			postFn(host, dataset, gene, samples).map(resp => indexMutations(gene, resp)),
		// Generate case permutations of the gene parameter
		sparseDataMatchField: postFn => (host, field, dataset, genes) =>
			postFn(host, field, dataset, _.flatmap(genes, permuteCase))
			.map(list => alignMatches(genes, list)),
		// Convert the gene parameter to lower-case, for matching
		sparseDataMatchFieldSlow: postFn => (host, field, dataset, genes) =>
			postFn(host, field, dataset, genes.map(g => g.toLowerCase()))
			.map(list => alignMatches(genes, list)),
		// Convert fields to lower-case, for matching, and apply a transform that
		// requires the 'fields' parameter.
		matchFields: postFn => (host, dataset, fields) =>
			postFn(host, dataset, _.map(fields, f => f.toLowerCase()))
				.map(list => alignMatches(fields, list))
	};

	var mapPostFn = (transform, name) => transform(postMethods[name]),
		mapFnPosts = _.mapObject(mapFns, mapPostFn);

	return _.merge(postMethods, mapFnPosts);
}

//queryPosts = transformPOSTMethods(queryPosts);

////////////////////////////////////////////////////
// Wrap POST methods so they will take either a dsID, or
// (host, name) as the first parameters.

function wrapDsIDParams(postMethods) {
	let dsIDFns = [
		'allFieldMetadata',
		'datasetSamples',
		'datasetFieldExamples',
		'datasetField',
		'datasetProbeValues',
		'datasetGeneProbesValues',
		'datasetGeneProbeAvg',
		'datasetMetadata',
		'featureList',
		'fieldCodes',
		'refGeneExons',
		'refGenePosition',
		'segmentedDataRange',
		'segmentedDataExamples',
		'sparseData',
		'sparseDataExamples'],

		dsIDFnPosts = _.mapObject(_.pick(postMethods, dsIDFns), dsIDFn);

	return _.merge(postMethods, dsIDFnPosts);
}

////////////////////////////////////////////////////
// Apply transforms.
queryPosts = wrapDsIDParams(transformPOSTMethods(queryPosts));

////////////////////////////////////////////////////
// Derived queries

var {datasetMetadata, refGenePosition, refGeneExons} = queryPosts;

// Override sparseDataMatchField to dispatch to the 'Slow' version
// if necessary.
var sparseDataMatchField = _.curry((field, host, dataset, genes) =>
	(_.max(_.map(genes, permuteBitCount)) > 7 ?
		queryPosts.sparseDataMatchFieldSlow :
		queryPosts.sparseDataMatchField)(host, field, dataset, genes));


// Look up gene strand from refGene, using the assembly specified
// in the probemap metadata
var probemapGeneStrand = dsIDFn((host, probemap, gene) =>
	datasetMetadata(host, probemap).flatMap(([{assembly}]) => {
		var {host, name} = refGene[assembly || 'hg19'];
		return refGenePosition(host, name, gene);
	}).map(({strand}) => strand));

// case-insensitive gene lookup
var refGeneExonCase = dsIDFn((host, dataset, genes) =>
	sparseDataMatchField('name2', host, dataset, genes)
		.flatMap(caseGenes => refGeneExons(host, dataset, caseGenes)));


// test if host is up
function testHost (host) {
	return Rx.Observable.ajax(xenaPost(host, '(+ 1 2)'))
		.timeout(5000, Rx.Observable.of({}))
		.map(s => !!(s.response && 3 === JSON.parse(s.response)));
}

module.exports = {
	...queryPosts,

	// derived query posts
	probemapGeneStrand,
	refGeneExonCase,
	sparseDataMatchGenes: sparseDataMatchField('genes'),

	// helpers:
	parseDsID,
	nanstr,
	xenaPost,
	testHost,

	// reference
	refGene,
	transcript
};
