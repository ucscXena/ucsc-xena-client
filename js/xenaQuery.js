/*eslint camelcase: 0, no-multi-spaces: 0, no-mixed-spaces-and-tabs: 0 */

'use strict';

var Rx = require('rx-dom');
require('rx.binding');
var _ = require('./underscore_ext');
var {permuteCase, permuteBitCount} = require('./permuteCase');

// HELPERS

var null_cohort = '(unassigned)';

function json_resp(xhr) {
	return JSON.parse(xhr.response);
}

function quote(s) {
	return '"' + s + '"'; // XXX should escape "
}

function sep(l) {
	return _.map(l, quote).join(' ');
}

//	function listfmt(l) {
//		return '(' + sep(l) + ')';
//	}

function arrayfmt(l) {
	return '[' + sep(l) + ']';
}

function nanstr(v) {
	if (isNaN(v)) {
		return null;
	}
	return v;
}

// XXX should make this the default quote(), since all null
// values should be mapped to nil. Should drop null_cohort, and
// deal with null->"" in the cohort selection UI code. option
// elements always have string values, so need a special null value.
function quote_cohort(cohort) {
	return (cohort === null_cohort) ? 'nil' : quote(cohort);
}

function parse_host(dsID) {
	var host_name = JSON.parse(dsID);
	return [host_name.host, host_name.name];
}

function dsID_fn(fn) {
	return function (dsID) {
		var args = Array.prototype.slice.call(arguments, 1),
			p = parse_host(dsID);
		return fn.apply(this, p.concat(args));
	};
}

function parse_server(s) {
	// XXX should throw or otherwise indicate parse error on no match
	var tokens = s.match(/^(https?:\/\/)?([^:\/]+)(:([0-9]+))?(\/(.*))?$/),
		host = tokens[2],
		defproto = 'https://',
		proto = tokens[1] || defproto,
		defport = (proto === defproto) ? '443' : '7222',
		port = tokens[4] || defport,
		path = tokens[5] || '',
		url;

	url = proto + host + ':' + port + path;

	return {
		url: url
	};
}

function server_url(s) {
	return parse_server(s).url;
}

// Returns a object with key equal to the serialization of
// the request, and value equal to a thunk that returns
// an Observable of the data.
// new optional id parameter is for differentiate the same req with some sort of user-supplied identification
function reqObj(req, fn, id) { // TODO may not belong in this file
	return {
		id: JSON.stringify(req) + id,
		query: Rx.Observable.defer(_.partial(fn, req))
	};
}

function indexFeatures(features) {
	return _.object(_.map(features, function (f) {
		return [f.name, f.longtitle || f.name];
	}));
}

function indexCodes(xhr) {
	var codes = JSON.parse(xhr.response);
	return _.object(_.map(codes, function (row) {
		return [row.name, row.code && row.code.split('\t')];
	}));
}

function xena_dataset_list_transform(host, list) {
	return _.map(list, function (ds) {
		var text = JSON.parse(ds.text) || {};
		// merge curated fields over raw metadata
		// XXX note that we're case sensitive on raw metadata
		ds = _.extend(text, _.dissoc(ds, 'text'));
		return _.extend(ds, {
			dsID: JSON.stringify({host: host, name: ds.name}),
			label: ds.label || ds.name
		});
	});
}

//	function xena_get(host, query) {
//		return {
//			url: host + '/data/' + encodeURIComponent(query),
//			method: 'GET'
//		};
//	}

function xena_post(host, query) {
	return {
		headers: {'Content-Type': 'text/plain' },
		url: host + '/data/',
		body: query,
		method: 'POST'
	};
}

// QUERY STRINGS

function xenaCall(queryFn, ...params) {
	return `(${queryFn} ${params.join(' ')})`;
}

var datasetSamples = require('./queries/datasetSamples.xq');
function dataset_samples_query(dataset) {
	return xenaCall(datasetSamples, quote(dataset));
}

var cohortSamples = require('./queries/cohortSamples.xq');
function all_samples_query(cohort) {
	return xenaCall(cohortSamples, quote_cohort(cohort));
}

var allCohorts = require('./queries/allCohorts.xq');
function all_cohorts_query() {
	return xenaCall(allCohorts);
}

var datasetList = require('./queries/datasetList.xq');
function dataset_list_query(cohorts) {
	return xenaCall(datasetList, arrayfmt(cohorts));
}

var datasetMetadata = require('./queries/datasetMetadata.xq');
function dataset_metadata_string(dataset) {
	return xenaCall(datasetMetadata, quote(dataset));
}

var datasetProbeValues = require('./queries/datasetProbeValues.xq');
function dataset_probe_string(dataset, samples, probes) {
	return xenaCall(datasetProbeValues, quote(dataset), arrayfmt(samples), arrayfmt(probes));
}

var datasetFieldExamples = require('./queries/datasetFieldExamples.xq');
function dataset_field_examples_string(dataset) {
	return xenaCall(datasetFieldExamples, quote(dataset));
}

var datasetField = require('./queries/datasetField.xq');
function dataset_field_string(dataset) {
	return xenaCall(datasetField, quote(dataset));
}

var datasetGeneProbes = require('./queries/datasetGeneProbes.xq');
function dataset_gene_probes_string(dataset, samples, gene) {
	return xenaCall(datasetGeneProbes, quote(dataset), arrayfmt(samples), quote(gene));
}


// Might want to check the performance of the map for probes, since it's
// being evaled for every element of the probes-map result set.
var datasetGeneProbeAvg = require('./queries/datasetGeneProbeAvg.xq');
function dataset_gene_string(dataset, samples, genes) {
	return xenaCall(datasetGeneProbeAvg, quote(dataset), arrayfmt(samples), arrayfmt(genes));
}

// XXX should really be called "MatchGene", as this isn't a field
var sparseDataMatchField = require('./queries/sparseDataMatchField.xq');
var sparse_data_match_field_string_opt = (field, dataset, gene) =>
	xenaCall(sparseDataMatchField, quote(field), quote(dataset), arrayfmt(_.flatmap(gene, permuteCase)));

// XXX need server support for functions in :where clauses in order to rewrite this.
// XXX should really be called "MatchGene", as this isn't a field
var sparseDataMatchFieldSlow = require('./queries/sparseDataMatchFieldSlow.xq');
var sparse_data_match_field_string_slow = (field, dataset, genes) =>
	xenaCall(sparseDataMatchFieldSlow, quote(field), quote(dataset), arrayfmt(_.map(genes, g => g.toLowerCase())));

// XXX should really be called "MatchGene", as this isn't a field
var sparse_data_match_field_string = _.curry((field, dataset, genes) =>
	(_.max(_.map(genes, permuteBitCount)) > 7 ?
		sparse_data_match_field_string_slow :
		sparse_data_match_field_string_opt)(field, dataset, genes)
);

var matchFields = require('./queries/matchFields.xq');
function match_fields_string(dataset, fields) {
	return xenaCall(matchFields, quote(dataset), arrayfmt(_.map(fields, f => f.toLowerCase())));
}

var sparseData = require('./queries/sparseData.xq');
// XXX Can't rewrite :samples until we can do 'distinct', or 'keys' for category fields, on the server.
function sparse_data_string(dataset, samples, gene) {
	return xenaCall(sparseData, quote(dataset), arrayfmt(samples), quote(gene));
}

var segmentedDataRange = require('./queries/segementedDataRange.xq');
function segmented_data_range_string(dataset, samples, chr, start, end) {
	return xenaCall(segmentedDataRange, quote(dataset), arrayfmt(samples), quote(chr), start, end);
}

var sparseDataExample = require('./queries/sparseData.xq');
function sparse_data_example_string(dataset, count) {
	return xenaCall(sparseDataExample, quote(dataset), count);
}

var featureList = require('./queries/featureList.xq');
function feature_list_query(dataset) {
	return xenaCall(featureList, quote(dataset));
}

var fieldMetadata = require('./queries/fieldMetadata.xq');
function features_string(dataset, fields) {
	return xenaCall(fieldMetadata, quote(dataset), arrayfmt(fields));
}

var allFieldMetadata = require('./queries/allFieldMetadata.xq');
function all_features_string(dataset) {
	return xenaCall(allFieldMetadata, quote(dataset));
}

var fieldCodes = require('./queries/fieldCodes.xq');
function codes_string(dataset, fields) {
	return xenaCall(fieldCodes, quote(dataset), arrayfmt(fields));
}

// XXX "position", "position (2)" is really horrible, here. Need better naming for position fields.
// Might want to allow renaming fields, with [:old-name :new-name]
// Also, cds doesn't really need to be indexed.
// XXX Should we write a compact collection type, where columns are in typed arrays? Maybe with codes? Or run-length encoding?
var refGeneExons = require('./queries/refGeneExons.xq');
function refGene_exon_string(dataset, genes) {
	return xenaCall(refGeneExons, quote(dataset), arrayfmt(genes));
}

var refGenePosition = require('./queries/refGenePosition.xq');
function gene_position(dataset, gene) {
	return xenaCall(refGenePosition, quote(dataset), quote(gene));
}

//	function refGene_gene_pos(gene) {
//		return `(xena-query {:select ["position" "name2"]\n` +
//			   `             :from ["common/GB/refgene_good"]\n` +
//			   `             :where [:in :any "name2" ${arrayfmt([gene])}]})`;
//	}

// QUERY PREP

// Look up all datasets for the given cohort, searching
// all servers. Then, index the results by server and by dataset.
function dataset_list_deprecate(servers, cohort) {
	console.warn('deprecated call to dataset_list');
	return Rx.Observable.zipArray(_.map(servers, function (s) {
		return Rx.DOM.ajax(
			xena_post(s, dataset_list_query(cohort))
		).map(
			_.compose(_.partial(xena_dataset_list_transform, s), json_resp)
		).catch(Rx.Observable.return([])); // XXX display message?
	})).map(function (datasets_by_server) {
		// Associate server with dataset list
		return _.map(servers, function (server, i) {
			return {server: server, datasets: datasets_by_server[i]};
		});
	});
}

function dataset_list_new(server, cohort) {
	return Rx.DOM.ajax(
		xena_post(server, dataset_list_query(cohort))
	).map(resp => xena_dataset_list_transform(server, json_resp(resp)));
}

function dataset_list(server, cohort) {
	return (_.isArray(server) ? dataset_list_deprecate :
		dataset_list_new)(server, cohort);
}

function code_list(host, ds, probes) {
	return Rx.DOM.ajax(
		xena_post(host, codes_string(ds, probes))
	).select(indexCodes);
}

// XXX is this used? Note dataset_metadata_string returns an array of
// length one.
function dataset_by_name(host, name) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_metadata_string(name))
	).map(_.compose(_.partial(xena_dataset_list_transform, host),
					json_resp))
	.catch(Rx.Observable.return([]));  // XXX display message?
}

function dataset_field_examples(host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_field_examples_string(ds))
	).map(json_resp);
}

function dataset_field(host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_field_string(ds))
	).map(json_resp);
}

function sparse_data_examples(host, ds, count) {
	return Rx.DOM.ajax(
		xena_post(host, sparse_data_example_string(ds, count))
	).map(json_resp);
}

function dataset_probe_values(host, ds, samples, probes) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_probe_string(ds, samples, probes))
	).map(json_resp);
}

function dataset_gene_probe_values(host, ds, samples, gene) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_gene_probes_string(ds, samples, gene))
	).map(json_resp);
}

function dataset_genes_values(host, ds, samples, genes) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_gene_string(ds, samples, genes))
	).map(json_resp);
}

function dataset_metadata(host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_metadata_string(ds))
	).map(json_resp);
}

function feature_list(host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, feature_list_query(ds))
	).map(_.compose(indexFeatures, json_resp));
}

function indexFeatureDetail(features) {
	return _.reduce(features, function (acc, row) {
		acc[row.name] = row;
		return acc;
	}, {});
}

function dataset_feature_detail(host, ds, probes) {
	return Rx.DOM.ajax(
		xena_post(host, probes ? features_string(ds, probes) : all_features_string(ds))
	).map(_.compose(indexFeatureDetail, json_resp));
}

function dataset_samples(host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_samples_query(ds))
	).map(json_resp);
}

function mutation_attrs(list) {
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
			"amino_acid": row['amino-acid'],
			"rna_vaf": nanstr(row['rna-vaf']),
			"dna_vaf": nanstr(row['dna-vaf'])
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
	var rows = mutation_attrs(collateRows(resp.rows));
	return {
		rows,
		samplesInResp: _.uniq(resp.samples) // XXX rename this after deprecating samples
	};
}

function sparse_data_values(host, ds, gene, samples) {
	return Rx.DOM.ajax(
		xena_post(host, sparse_data_string(ds, samples, gene))
		// XXX change indexMutations so it can handle an array?
	).map(json_resp).map(resp => indexMutations(gene, resp));
}

var segmented_attrs = list =>
	_.map(list, row => ({
		"sample": row.sampleID,
		"chr": row.position.chrom,
		"start": row.position.chromstart,
		"end": row.position.chromend,
		"value": row.value
	}));

function indexSegmented(resp) {
	// XXX The query for samples is returning every row in the dataset,
	// rather than distinct sampleIDs from the dataset. We need a
	// 'distinct' function for xena-query.
	var rows = segmented_attrs(collateRows(resp.rows));
	return {
		rows,
		samplesInResp: _.uniq(resp.samples) // XXX rename this after deprecating samples
	};
}

function segmented_data_range_values(host, ds, chr, start, end, samples) {
	return Rx.DOM.ajax(
		xena_post(host, segmented_data_range_string(ds, samples, chr, start, end))
	).map(json_resp).map(indexSegmented);
}


function align_matches(input, matches) {
	var index = _.object(_.map(matches, g => g.toLowerCase()), matches);
	return _.map(input, g => index[g.toLowerCase()] || g);
}

var sparse_data_match_field = _.curry((field, host, ds, genes) => {
	return Rx.DOM.ajax(
		xena_post(host, sparse_data_match_field_string(field, ds, genes))
	).map(json_resp).map(list => align_matches(genes, list));
});

var sparse_data_match_genes = sparse_data_match_field('genes');

function splitExon(s) {
	return _.map(s.replace(/,$/, '').split(','), _.partial(parseInt, _, 10));
}

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

function refGene_attrs(row) {
	return {
		name2: row.name2[0],
		strand: row.position.strand,
		txStart: row.position.chromstart,
		txEnd: row.position.chromend,
		chrom: row.position.chrom,
		cdsStart: row['position (2)'].chromstart,
		cdsEnd: row['position (2)'].chromend,
		exonCount: row.exonCount,
		exonStarts: splitExon(row.exonStarts),
		exonEnds: splitExon(row.exonEnds)
	};
}

function indexRefGene(resp) {
	return _.object(resp.name2, _.map(collateRows(resp), refGene_attrs));
}

function refGene_exon_values(host, ds, genes) {
	return Rx.DOM.ajax(
		xena_post(host, refGene_exon_string(ds, genes))
	).map(json_resp).map(indexRefGene);
}

// case-insensitive gene lookup
function refGene_exon_case(host, ds, genes) {
	return sparse_data_match_field('name2', host, ds, genes)
		.flatMap(caseGenes => refGene_exon_values(host, ds, caseGenes));
}

function match_fields(host, ds, fields) {
	return Rx.DOM.ajax(
		xena_post(host, match_fields_string(ds, fields))
	).map(json_resp).map(list => align_matches(fields, list));
}

function all_samples(host, cohort) {
	return Rx.DOM.ajax(
		xena_post(host, all_samples_query(cohort))
	).map(json_resp);
}

// XXX Have to use POST here because the genome-cancer reverse proxy fails
// on odd characters, such as "/".
// http://stackoverflow.com/questions/3235219/urlencoded-forward-slash-is-breaking-url
function all_cohorts(host) {
	return Rx.DOM.ajax(
		xena_post(host, all_cohorts_query())
	).map(json_resp);
}

// test if host is up
function test_host (host) {
	return Rx.DOM.ajax(
		xena_post(host, '(+ 1 2)')
	).map(function(s) {
		if (s.responseText) {
			return (3 === JSON.parse(s.responseText));
		}
		return false;
	});//.catch(Rx.Observable.return([]));  // XXX display message?
}

function refGene_gene_strand({host, name}, gene) {
	return Rx.DOM.ajax(xena_post(host, gene_position(name, gene)))
		.map(json_resp).map(({strand}) => strand);
}

var probemap_gene_strand = (host, probemap, gene) =>
	dataset_metadata(host, probemap).flatMap(([{text}]) =>
		refGene_gene_strand(refGene[_.get(JSON.parse(text), 'assembly', 'hg19')], gene));

module.exports = {
	// helpers:
	dsID_fn,
	parse_host,
	server_url,
	json_resp,
	nanstr,
	reqObj,
	xena_post,

	// query strings:
	codes_string,
	features_string,
	dataset_gene_string,
	dataset_gene_probes_string,
	dataset_probe_string,
	sparse_data_string,
	refGene_exon_string,

	// query prep:
	dataset_list,
	feature_list,
	code_list,
	dataset_field_examples,
	dataset_field,
	sparse_data_examples,
	dataset_probe_values,
	dataset_gene_probe_values, // XXX mk plural genes?
	dataset_genes_values,
	dataset_samples,
	dataset_feature_detail,
	all_samples,
	all_cohorts,
	dataset_by_name,
	probemap_gene_strand,

	sparse_data_match_genes,
	sparse_data_values,
	segmented_data_range_values,
	refGene_exon_values,
	refGene_exon_case,
	match_fields,
	test_host,
	refGene,
	transcript
};
