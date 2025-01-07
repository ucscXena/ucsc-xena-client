/*eslint camelcase: 0, no-multi-spaces: 0, no-mixed-spaces-and-tabs: 0 */


import {concatBins, parse} from './binpackJSON';
import {hfcCompress} from './hfc';
var Rx = require('./rx').default;
var _ = require('./underscore_ext').default;
var {permuteCase, permuteBitCount, prefixBitLimit} = require('./permuteCase');
// Load all query files as a map of strings.
import * as qs from './loadXenaQueries';
var wasm = require('ucsc-xena-wasm');

var maxPermute = 7; // max number of chars to permute for case-insensitive match
import cohortMetaData from './cohortMetaData';

var {ajax} = Rx.Observable;

///////////////////////////////////////////////////////
// support for hg18/GRCh36, hg19/GRCh37, hg38/GRCh38, mm10
// Xena refGene is the composite gene model we build, NOT literally "refGene annotation"
var refGene = {
	hg18: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	GRCh36: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	hg19: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19_V24lift37'},
	GRCh37: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19_V24lift37'},
	hg38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'},
	GRCh38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'},
	mm9: {host: 'https://reference.xenahubs.net', name: 'refgene_good_mm9'},
	mm10: {host: 'https://reference.xenahubs.net', name: 'gencode_good_mm10'}
};

// support for hg18/GRCh36, hg19/GRCh37, hg38/GRCh38
var transcript = {
	hg18: {host: 'https://reference.xenahubs.net', name: 'refGene_hg18'},
	GRCh36: {host: 'https://reference.xenahubs.net', name: 'refGene_hg18'},
	hg19: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasicV24lift37'},
	GRCh37: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasicV24lift37'},
	hg38: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasicV24'},
	GRCh38: {host: 'https://reference.xenahubs.net', name: 'wgEncodeGencodeBasicV24'}
};

///////////////////////////////////////////////////////
// Serialization helpers

// XXX make dispatch server-specific, so we don't have to update all at once.
var jsonResp = xhr => JSON.parse(xhr.response); //eslint-disable-line no-unused-vars

var quote = s => s == null ? 'nil' : ('"' + s + '"'); // XXX should escape "
var toString = x => x.toString();

var sep = l =>
	typeof _.get(l, 0) === 'number' ? _.map(l, toString).join(' ') :
	_.map(l, quote).join(' ');

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
			"gene": _.getIn(row, ['genes', 0]),
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
	return _.times(rows[keys[0]].length, i => _.object(keys, _.map(keys, k => rows[k][i])));
}

// {:sampleid ["id0", "id1", ...], chromstart: [123, 345...], ...}
function indexMutations(resp) {
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
	return _.map(input, g => index[g.toLowerCase()]);
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

function transcriptAttrs(row) {
	return {
		name: row.name,
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
function indexTranscripts(resp) {
	return collateRows(resp).map(transcriptAttrs);
}

function encodeSamples(samples) {
	// samples is either an array, or a binary blob (Uint8Array) with
	// compressed data.
	return _.isArray(samples) ?
		Rx.Observable.bindCallback(wasm().then)()
			.map(Module => hfcCompress(Module, samples)) :
		Rx.Observable.of(samples);
}

// Generate sql patterns for case-insensitive match of a prefix, by
// permutting the characters having case, up to the character limit 'maxPermute'.
// The results have to be filtered, since they may contain spurious matches.
var prefixPatterns = prefix =>
	permuteCase(prefixBitLimit(maxPermute, prefix)).map(g => g + '%');

var filterByPrefix = prefix => list => {
	var lcPrefix = prefix.toLowerCase();
	return list.filter(m => m.toLowerCase().indexOf(lcPrefix) === 0);
};

////////////////////////////////////////////////////
// Query marshalling and dispatch

function xenaPost(host, query) {
	return {
		crossDomain: true,
		headers: {'Content-Type': 'text/plain', 'X-Redirect-To': location.origin},
		url: host + '/data/',
		body: query,
		// rxjs 5 defaults to 'json', which will cause the browser to parse
		// the response before it gets to us. That would be fine, except it's
		// not well supported cross-browser. In particular, it fails in
		// phantom 1.9 and IE. If removing this, also remove the JSON.parse
		// from jsonResp.
		responseType: 'text',
		withCredentials: true,
		method: 'POST'
	};
}

// XXX setting redirect to location here feels a bit dodgy. Do we know this request
// was made from the current href? Probably need to used a fixed redirect url
// specifically for handling this, and patch up the history after page load.
var xenaPostBPJ = (host, query) => ({
		crossDomain: true,
		headers: {'Content-Type': 'application/binpack-edn', 'accept': 'application/binpack-json', 'X-Redirect-To': location.origin},
		url: host + '/data/',
		body: query,
		// rxjs 5 defaults to 'json', which will cause the browser to parse
		// the response before it gets to us. That would be fine, except it's
		// not well supported cross-browser. In particular, it fails in
		// phantom 1.9 and IE. If removing this, also remove the JSON.parse
		// from jsonResp.
		responseType: 'arraybuffer',
		withCredentials: true,
		method: 'POST'
	});

function marshallParam(p) {
	if (_.isString(p)) {
		return quote(p);
	}
	if (_.isArray(p)) {
		// XXX Note this only works with string arrays.
		return arrayfmt(p);
	}
	if (_.isObject(p)) {
		return `{${_.keys(p).map(k => `"${k}" ${marshallParam(p[k])}`).join(' ')}}`;
	}
	return p == null ? 'nil' : p;
}

// marshall parameters and build the lisp call form
function xenaCall(queryFn, ...params) {
	return `(${queryFn} ${params.map(marshallParam).join(' ')})`;
}

function xenaCallBPJ(queryFn, ...params) {
	var bins = params.map(p => p && p.proxied).filter(p => p),
		i = 0,
		ps = params.map(p => _.Let((b = p && p.proxied) =>
						b ? {$type: "ref", value: {"$bin": i++}} : p)),
		edn = xenaCall(queryFn, ...ps);

	return concatBins(bins, edn);
}

var BPJAlts = {
	cohortSamples: 'cohortSamplesHFC',
	datasetSamplesExamples: 'datasetSamplesHFCExamples',
	datasetMetadata: 'datasetMetadataHFC',
	datasetList: 'datasetListHFC'
};

var getBPJQuery = name => _.get(qs, _.get(BPJAlts, name, name));

const notebookObs = Rx.Observable.fromEvent(window, 'message').share();
var msgId = 0;

// sendMessage wraps worker messages in ajax-like observables, by assigning
// unique ids to each request, and waiting for a single response with the
// same id. The worker must echo the id in the response.
const sendMessage = msg => {
	var id = msgId++;
	if (window.opener) {
		// should this 'localize' be here or in the notebook?
		var localizedMsg = _.assoc(msg, 'url', msg.url.replace(/^notebook:/, 'http://localhost:7222'));
		window.opener.postMessage({msg: localizedMsg, id}, "*"); // XXX fix *
		// XXX This timeout slows everything down, and potentially breaks
		// notebooks if the response is long. Need some sort of ping,
		// instead, so we only wait for a response if we know something
		// is listening.
		return notebookObs.filter(ev => ev.data.id === id).take(1).map(ev => ev.data)
			.timeoutWith(1000,
				Rx.Observable.of({status: 0, response: ''}, Rx.Scheduler.asap));
	}
	return Rx.Observable.of({status: 0, response: ''}, Rx.Scheduler.asap);
};

var dispatchQuery = query =>
	(query.url.indexOf('notebook:') === 0 ? sendMessage : ajax)(query);

// Given a host, query, and parameters, marshall the parameters and dispatch a
// POST, returning an observable.
function doPostBPJ(name, host, ...params) {
	var query = getBPJQuery(name);
	return dispatchQuery(
		xenaPostBPJ(host, xenaCallBPJ(query, ...params))
	).map(ajax => {
		if (ajax.status === 0) {
			// ajax failures in Firefox are not throwing for some reason,
			// so check status here & explicitly throw.
			throw new Error('AJAX status 0', {cause: ajax});
		}
		return {ajax, resp: parse(new Uint8Array(ajax.response))};
	});
}

function doPostJSON(name, host, ...params) {
	var query = qs[name];
	return dispatchQuery(
		xenaPost(host, xenaCall(query, ...params))
	).map(ajax => ({ajax, resp: jsonResp(ajax)}));
}

// This is weird, but we enabled the header after implementing bpj, so
// the server supports bpj if the header is readable. If status is zero,
// this check doesn't mean anything.
var getAPI = xhr => xhr.getResponseHeader('Xena-API') ? 'bpj' : 'json';

// cache of hub API version. We try this first.
var disposition = {};

var getResp = ({resp}) => resp;

// These 'try' methods are much too subtle, and reflect the failure modes
// when we send a query by the wrong method. CORS confuses things substantially,
// because we can't distinguish a CORS failure from a connection-refused, or
// other client-side failure.
function tryBPJPost(name, host, ...params) {
	return doPostBPJ(name, host, ...params).map(getResp)
		.catch(err => err.xhr.status !== 0 ?
			Rx.Observable.throw(err, Rx.Scheduler.asap) :
			doPostJSON(name, host, ...params).map(getResp)
				.do(() => disposition[host] = 'json')
			.catch(() => Rx.Observable.throw(err, Rx.Scheduler.asap)));
}

function tryJSONPost(name, host, ...params) {
	function swapAndRet(x) {
		disposition[host] = 'bpj';
		return x;
	}
	return doPostJSON(name, host, ...params)
		.flatMap(({resp, ajax}) =>
			getAPI(ajax.xhr) === 'bpj' ?
				swapAndRet(doPostBPJ(name, host, ...params)).map(getResp) :
				Rx.Observable.of(resp, Rx.Scheduler.asap))
		.catch(err =>
			getAPI(err.xhr) === 'bpj' ?
				swapAndRet(doPostBPJ(name, host, ...params)).map(getResp) :
				Rx.Observable.throw(err, Rx.Scheduler.asap));
}

function doPost(name, host, ...params) {
	var cached = disposition[host] = disposition[host] || 'bpj';
	return cached === 'json' ?
		tryJSONPost(name, host, ...params) :
		tryBPJPost(name, host, ...params);
}


// Create POST methods for all of the xena queries.
// We need to now support queries that change depending on the wire protocol.
// That includes the transforms, below. So, we need to wrap it after this point,
// query and transform selected with the POST method.
var queryPosts = _.mapObject(qs, (query, name) =>
		(...args) => doPost(name, ...args));

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
		geneTranscripts: mapResponse(indexTranscripts),
		refGeneExons: mapResponse(indexRefGene),
		refGeneRange: mapResponse(indexRefGene),
		segmentedDataRange: mapResponse(indexSegmented),
		// Apply a transform that requires the 'host' parameter
		datasetList: postFn => (host, cohort) =>
			postFn(host, cohort).map(resp => datasetListTransform(host, resp)),
		// Apply a transform that requires the 'host' parameter
		datasetMetadata: postFn => (host, dataset) =>
			postFn(host, dataset).map(resp => datasetListTransform(host, resp)),
		// Apply a transform that requires the 'host' parameter
		probemapList: postFn => host =>
			postFn(host).map(resp => datasetListTransform(host, resp)),
		sparseData: mapResponse(indexMutations),
		sparseDataRange: mapResponse(indexMutations),
		// Generate case permutations of the gene parameter
		sparseDataMatchField: postFn => (host, field, dataset, genes) =>
			postFn(host, field, dataset, _.flatmap(genes, permuteCase))
			.map(list => alignMatches(genes, list)),
		// Generate case permutations of the gene parameter
		sparseDataMatchPartialField: postFn => (host, field, dataset, prefix, limit) =>
			postFn(host, field, dataset, prefixPatterns(prefix), limit)
			.map(filterByPrefix(prefix)),
		// Convert the gene parameter to lower-case, for matching
		sparseDataMatchFieldSlow: postFn => (host, field, dataset, genes) =>
			postFn(host, field, dataset, genes.map(g => g.toLowerCase()))
			.map(list => alignMatches(genes, list)),
		// Generate case permutations of the gene parameter
		matchGenesWithProbes: postFn => (host, dataset, genes) =>
			postFn(host, dataset, _.flatmap(genes, permuteCase))
			.map(list => alignMatches(genes, list)),
		matchGenesWithProbesSlow: postFn => (host, dataset, genes) =>
			postFn(host, dataset, genes.map(g => g.toLowerCase()))
			.map(list => alignMatches(genes, list)),
		// Convert fields to lower-case, for matching, and apply a transform that
		// requires the 'fields' parameter.
		matchFields: postFn => (host, dataset, fields) =>
			postFn(host, dataset, _.map(fields, f => f.toLowerCase()))
				.map(list => alignMatches(fields, list)),
		matchFieldsFaster: postFn => (host, dataset, fields) =>
			postFn(host, dataset, _.flatmap(fields, permuteCase))
				.map(list => alignMatches(fields, list)),
		matchPartialField: postFn => (host, dataset, prefix, limit) =>
			postFn(host, dataset, prefixPatterns(prefix), limit)
			.map(filterByPrefix(prefix)),
		// XXX review 'max' parameter, for singlecell branch
		cohortSamples: postFn => (host, cohort, max) =>
			postFn(host, cohort, max).flatMap(encodeSamples)
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
		'datasetProbeSignature',
		'datasetGeneSignature',
		'datasetGeneProbesValues',
		'datasetChromProbeValues',
		'datasetCohort',
		'datasetGeneProbeAvg',
		'datasetMetadata',
		'featureList',
		'fieldCodes',
		'maxRange',
		'refGeneExons',
		'refGenePosition',
		'refGeneRange',
		'matchFields',
		'matchFieldsFaster',
		'matchGenesWithProbes',
		'matchPartialField',
		'segmentedDataRange',
		'segmentedDataExamples',
		'sparseData',
		'sparseDataRange',
		'sparseDataExamples'],

		dsIDFnPosts = _.mapObject(_.pick(postMethods, dsIDFns), dsIDFn);

	return _.merge(postMethods, dsIDFnPosts);
}

////////////////////////////////////////////////////
// Apply transforms.
queryPosts = wrapDsIDParams(transformPOSTMethods(queryPosts));

////////////////////////////////////////////////////
// Derived queries

var {datasetMetadata, refGenePosition, refGeneExons, refGeneRange} = queryPosts;

// Override sparseDataMatchField to dispatch to the 'Slow' version
// if necessary.
var sparseDataMatchField = _.curry((field, host, dataset, genes) =>
	(_.max(_.map(genes, permuteBitCount)) > 7 ?
		queryPosts.sparseDataMatchFieldSlow :
		queryPosts.sparseDataMatchField)(host, field, dataset, genes));

// Override matchGenesWithProbes to dispatch to the 'Slow' version
// if necessary.
var matchGenesWithProbes = (host, dataset, genes) =>
	(_.max(_.map(genes, permuteBitCount)) > 7 ?
		queryPosts.matchGenesWithProbesSlow :
		queryPosts.matchGenesWithProbes)(host, dataset, genes);

// Override matchField to dispatch to the slow version
// if necessary.
var matchFields = (host, dataset, probes) =>
	(_.max(_.map(probes, permuteBitCount)) > 7 ?
		 queryPosts.matchFields :
		 queryPosts.matchFieldsFaster)(host, dataset, probes);

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
		.flatMap(caseGenes => refGeneExons(host, dataset, _.filter(caseGenes, _.identity))));

var ping = host => dispatchQuery({
	url: host + '/ping/',
	method: 'GET',
	crossDomain: true,
	responseType: 'text'});

var toStatusDep = r =>
	JSON.parse(r.response) === 3 ? 'old' :
	'down';

var toStatus = r =>
	r.response === 'pong' ? 'up' :
	'down';

var pingOrExp = host =>
		ping(host).map(toStatus).catch(e =>
			e.status === 404 ? dispatchQuery(xenaPost(host, '(+ 1 2)')).map(toStatusDep) :
			Rx.Observable.throw(e));

var testStatus = (host, timeout = 5000) =>
	pingOrExp(host)
		.map(s => ({status: s}))
		.timeoutWith(timeout, Rx.Observable.of({status: 'down'}))
		.catch(({status, response}) => Rx.Observable.of(
			{status: status === 503 && response === 'Database booting' ? 'started' : 'down'}));

// test if host is up
var testHost = (host, timeout = 5000) => testStatus(host, timeout).map(({status}) => status === 'up' || status === 'old');

var loginQuery = host => dispatchQuery({
	url: host + '/code?loggedin=true',
	method: 'GET',
	crossDomain: true,
	withCredentials: true,
	responseType: 'text'});

var testLogin = (host, timeout = 5000) =>
	loginQuery(host).map(r => r.response === 'true')
		.timeoutWith(timeout, Rx.Observable.of(false))
		.catch(() => Rx.Observable.of(false));

var logout = host =>
	dispatchQuery({
	url: host + '/code?logout=true',
	method: 'GET',
	crossDomain: true,
	withCredentials: true,
	responseType: 'text'});

var cohortMetaURL = `${cohortMetaData}/xenacohort_tag.json`;

var cohortPreferredURL = `${cohortMetaData}/defaultDataset.json`;

var cohortPhenotypeURL = `${cohortMetaData}/defaultPhenotype.json`;

var cohortAnalyticURL =  `${cohortMetaData}/analytic.json`;

var cohortDefaultURL = `${cohortMetaData}/defaultCohortMetadata.json`;

var defaultStudyURL = `${cohortMetaData}/defaultStudy.json`;

var getStudy =
	_.Let((studyFiles = {
			htan: `${cohortMetaData}/defaultStudy_HTAN.json`,
			tcga: `${cohortMetaData}/defaultStudy_tcga.json`,
			collisson: `${cohortMetaData}/defaultStudy_collisson.json`,
			collissonControlAccess: `${cohortMetaData}/defaultStudy_collissonControlAccess.json`,
			controlAccess16080L: `${cohortMetaData}/defaultStudy_16-080L.json`,
			RongFanLab: `${cohortMetaData}/defaultStudy_RongFanLab.json`,
			tmp: `${cohortMetaData}/defaultStudy_tmp.json`,
			default: defaultStudyURL}) =>
		study => studyFiles[study] || defaultStudyURL);

// For testing
//var analyticTest = encodeURIComponent(JSON.stringify({
//	'TCGA Breast Cancer (BRCA)': [
//		{
//			name: 'TCGA.BRCA.sampleMap/AgilentG4502A_07_3',
//			host: 'https://tcga.xenahubs.net',
//			fields: '=TP53 + FOXM1',
//			label: 'a signature', // label in wizard
//			columnLabel: 'My cool signature',
//			fieldLabel: 'Something something TP53',
//			width: 250
//		},
//		{
//			name: 'TCGA.BRCA.sampleMap/BRCA_clinicalMatrix',
//			host: 'https://tcga.xenahubs.net',
//			fields: 'CN_Clusters_nature2012',
//			label: 'a phenotype', // label in wizard
//		},
//	]
//}));
//var cohortAnalyticURL = `data:application/json,${analyticTest}`;

var tumorMapURL = `${cohortMetaData}/defaultTumormap.json`;

var fetchJSON = url =>
	Rx.Observable.ajax({
		url,
		method: 'GET',
		responseType: 'json',
		crossDomain: true
	}).map(xhr => xhr.response)
	.catch(() => Rx.Observable.of({}, Rx.Scheduler.asap));

module.exports = {
	...queryPosts,

	// derived query posts
	probemapGeneStrand,
	refGeneExonCase,
	refGeneRange,
	sparseDataMatchGenes: dsIDFn(sparseDataMatchField('genes')),
	matchFields: dsIDFn(matchFields),
	matchGenesWithProbes: dsIDFn(matchGenesWithProbes),

	// helpers:
	parseDsID,
	nanstr,
	xenaPost,
	testHost,
	testStatus,
	testLogin,
	logout,

	// reference
	refGene,
	transcript,

	// cohort meta
	fetchCohortMeta: fetchJSON(cohortMetaURL),
	fetchCohortPreferred: fetchJSON(cohortPreferredURL),
	fetchCohortPhenotype: fetchJSON(cohortPhenotypeURL),
	fetchCohortAnalytic: fetchJSON(cohortAnalyticURL),
	fetchCohortDefault: fetchJSON(cohortDefaultURL),
	fetchDefaultStudy: _.compose(fetchJSON, getStudy),
	fetchTumorMap: fetchJSON(tumorMapURL),
};
