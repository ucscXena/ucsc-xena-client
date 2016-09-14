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

function dataset_samples_query(dataset) {
	return '(map :value\n' +
		   '  (query\n' +
		   '    {:select [:value]\n' +
		   '     :from [:dataset]\n' +
		   '     :join [:field [:= :dataset.id :dataset_id]\n' +
		   '            :code [:= :field.id :field_id]]\n' +
		   '     :where [:and\n' +
		   '             [:= :dataset.name ' + quote(dataset) + ']\n' +
		   '             [:= :field.name "sampleID"]]}))';
}

function all_samples_query(cohort) {
	return '(map :value\n' +
		   '  (query\n' +
		   '    {:select [:%distinct.value]\n' +
		   '     :from [:dataset]\n' +
		   '     :join [:field [:= :dataset.id :dataset_id]\n' +
		   '            :code [:= :field_id :field.id]]\n' +
		   '     :where [:and [:= :cohort ' + quote_cohort(cohort) + ']\n' +
		   '                  [:= :field.name "sampleID"]]}))';
}

function all_cohorts_query() {
	return '(map :cohort\n' +
		   '  (query\n' +
		   '    {:select [[#sql/call [:distinct #sql/call [:ifnull :cohort "(unassigned)"]] :cohort]]\n' +
		   '     :from [:dataset]}))';
}

function dataset_list_query(cohorts) {
	return '(query {:select [:name :type :datasubtype :probemap :text :status]\n' +
		   '        :from [:dataset]\n' +
		   `        :where [:in :cohort ${arrayfmt(cohorts)}]})`;
}

function dataset_query (dataset) {
	return '(query {:select [:name :longtitle :type :datasubtype :probemap :text :status]\n' +
		   '        :from [:dataset]\n' +
		   '        :where [:= :dataset.name ' + quote(dataset) + ']})';
}

function dataset_probe_string(dataset, samples, probes) {
	return '(fetch [{:table ' + quote(dataset) + '\n' +
		   '         :columns ' +  arrayfmt(probes) + '\n' +
		   '         :samples ' + arrayfmt(samples) + '}])';
}

function dataset_field_examples_string(dataset) {
	return '(query {:select [:field.name]\n' +
		   '        :from [:dataset]\n' +
		   '        :join [:field [:= :dataset.id :dataset_id]]\n' +
		   '        :where [:= :dataset.name ' + quote(dataset) + ']\n' +
		   '        :limit 10})';
}

function dataset_field_string(dataset) {
	return '(query {:select [:field.name]\n' +
		   '        :from [:dataset]\n' +
		   '        :join [:field [:= :dataset.id :dataset_id]]\n' +
		   '        :where [:= :dataset.name ' + quote(dataset) + ']})';
}

function dataset_gene_probes_string(dataset, samples, gene) {
	return `(let [probemap (:probemap (car (query {:select [:probemap]\n` +
		   `                                       :from [:dataset]\n` +
		   `                                       :where [:= :name ${quote(dataset)}]})))\n` +
		   `      probes ((xena-query {:select ["name"] :from [probemap] :where [:in :any "genes" ${arrayfmt([gene])}]}) "name")]\n` +
		   `  [probes\n` +
		   `    (fetch [{:table ${quote(dataset)}\n` +
		   `             :samples ${arrayfmt(samples)}\n` +
		   `             :columns probes}])])`;
}

// Might want to check the performance of the map for probes, since it's
// being evaled for every element of the probes-map result set.
function dataset_gene_string(dataset, samples, genes) {
	return `(let [probemap (:probemap (car (query {:select [:probemap]\n` +
		   `                                       :from [:dataset]\n` +
		   `                                       :where [:= :name ${quote(dataset)}]})))\n` +
		   `      probes-for-gene (fn [gene] ((xena-query {:select ["name"] :from [probemap] :where [:in :any "genes" [gene]]}) "name"))\n` +
		   `      avg (fn [scores] (mean scores 0))\n`  +
		   `      scores-for-gene (fn [gene]\n` +
		   `          (let [probes (probes-for-gene gene)\n` +
		   `                scores (fetch [{:table ${quote(dataset)}\n` +
		   `                                :samples ${arrayfmt(samples)}\n` +
		   `                                :columns (probes-for-gene gene)}])]\n` +
		   `            {:gene gene\n` +
		   `             :scores (if (car probes) (avg scores) [[]])}))]\n` +
		   `  (map scores-for-gene ${arrayfmt(genes)}))`;
}

var sparse_data_match_field_string_opt = (field, dataset, genes) => {
	return '(let [getfield (fn [field]\n' +
		   '                 (:id (car (query {:select [:field.id]\n' +
		   '                                   :from [:dataset]\n' +
		   '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		   `                                   :where [:and [:= :field.name field] [:= :dataset.name ${quote(dataset)}]]}))))\n` +
		   `      genes (getfield "${field}")]\n` +
		   '  (map :gene (query {:select [:%distinct.gene]\n' +
		   '                     :from [:field_gene]\n' +
		   `                     :join [{:table [[[:name :varchar ${arrayfmt(_.flatmap(genes, permuteCase))}]] :T]} [:= :T.name :gene]]\n` +
		   '                     :where [:= :field_gene.field_id genes]})))\n';
};

// XXX need server support for functions in :where clauses in order to rewrite this.
var sparse_data_match_field_string_slow = (field, dataset, genes) => {
	return '(let [getfield (fn [field]\n' +
		   '                 (:id (car (query {:select [:field.id]\n' +
		   '                                   :from [:dataset]\n' +
		   '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		   `                                   :where [:and [:= :field.name field] [:= :dataset.name ${quote(dataset)}]]}))))\n` +
		   `      genes (getfield "${field}")]\n` +
		   '  (map :gene (query {:select [:%distinct.gene]\n' +
		   '                     :from [:field_gene]\n' +
		   '                     :where [:and\n' +
		   '                             [:= :field_gene.field_id genes]\n' +
		   `                             [:in :%lower.gene ${arrayfmt(_.map(genes, g => g.toLowerCase()))}]]})))`;
};

var sparse_data_match_field_string = _.curry((field, dataset, genes) =>
	(_.max(_.map(genes, permuteBitCount)) > 7 ?
		sparse_data_match_field_string_slow :
		sparse_data_match_field_string_opt)(field, dataset, genes)
);

function match_fields_string(dataset, fields) {
	return '(map :name (query {:select [:field.name]\n' +
		   '                   :from [:dataset]\n' +
		   '                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		   '                   :where [:and [:in :%lower.field.name ' + arrayfmt(_.map(fields, f => f.toLowerCase())) + '] [:= :dataset.name ' + quote(dataset) + ']]}))';
}

// XXX Can't rewrite :samples until we can do 'distinct', or 'keys' for category fields, on the server.
function sparse_data_string(dataset, samples, gene) {
	return `(let [samples ${arrayfmt(samples)}\n` +
		   `      dataset ${quote(dataset)}\n` +
		   `      gene ${quote(gene)}\n` +
		   '      getfield (fn [field]\n' +
		   '                 (:id (car (query {:select [:field.id]\n' +
		   '                                   :from [:dataset]\n' +
		   '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		   '                                   :where [:and [:= :field.name field] [:= :dataset.name dataset]]}))))\n' +
		   '      sampleID (getfield "sampleID")]\n' +
		   '  {:samples (map :value (query {:select [:value]\n' +
		   '                                :from [:code]\n' +
		   '                                :where [:and [:in :value samples][:= :field_id sampleID]]}))\n' +
		   '   :rows (xena-query {:select ["ref" "alt" "altGene" "effect" "dna-vaf" "rna-vaf" "amino-acid" "genes" "sampleID" "position"]\n' +
		   '                      :from [dataset]\n' +
		   '                      :where [:and [:in :any "genes" [gene]] [:in "sampleID" samples]]})})';
}

function sparse_data_example_string(dataset, count) {
	return `{:rows (xena-query {:select ["ref" "alt" "altGene" "effect" "dna-vaf" "rna-vaf" "amino-acid" "genes" "sampleID" "position"]\n` +
		   `                    :from [${quote(dataset)}]\n` +
		   `                    :limit ${count}})}`;
}

function dataset_string(dataset) {
	return '(:text (car (query {:select [:text]\n' +
		   '                    :from [:dataset]\n' +
		   '                    :where [:= :name ' + quote(dataset) + ']})))';
}

function feature_list_query(dataset) {
	return '(query {:select [:field.name :feature.longtitle]\n' +
		   '        :from [:field]\n' +
		   '        :where [:= :dataset_id {:select [:id]\n' +
		   '                         :from [:dataset]\n' +
		   '                         :where [:= :name ' + quote(dataset) + ']}]\n' +
		   '        :left-join [:feature [:= :feature.field_id :field.id]]})';
}

function features_string(dataset, probes) {
	return '(query\n' +
		   '  {:select [:P.name :feature.*]\n' +
		   '   :from [[{:select [:field.name :field.id]\n' +
		   '            :from [:field]\n' +
		   '            :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :field.name]]\n' +
		   '            :where [:= :dataset_id {:select [:id]\n' +
		   '                             :from [:dataset]\n' +
		   '                             :where [:= :name ' + quote(dataset) + ']}]} :P]]\n' +
		   '   :left-join [:feature [:= :feature.field_id :P.id]]})';
}

function all_features_string(dataset) {
	return '(query {:select [:field.name :feature.*]\n' +
		   '        :from [:field]\n' +
		   '        :where [:= :dataset_id {:select [:id]\n' +
		   '                         :from [:dataset]\n' +
		   '                         :where [:= :name ' + quote(dataset) + ']}]\n' +
		   '        :left-join [:feature [:= :feature.field_id :field.id]]})';
}

function codes_string(dataset, probes) {
	return '(query\n' +
		   '  {:select [:P.name [#sql/call [:group_concat :value :order :ordering :separator #sql/call [:chr 9]] :code]]\n' +
		   '   :from [[{:select [:field.id :field.name]\n' +
		   '            :from [:field]\n' +
		   '            :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :field.name]]\n' +
		   '            :where [:= :dataset_id {:select [:id]\n' +
		   '                             :from [:dataset]\n' +
		   '                             :where [:= :name ' + quote(dataset) + ']}]} :P]]\n' +
		   '   :left-join [:code [:= :P.id :field_id]]\n' +
		   '   :group-by [:P.id]})';
}

// XXX "position", "position (2)" is really horrible, here. Need better naming for position fields.
// Might want to allow renaming fields, with [:old-name :new-name]
// Also, cds doesn't really need to be indexed.
// XXX Should we write a compact collection type, where columns are in typed arrays? Maybe with codes? Or run-length encoding?
function refGene_exon_string(dsID, genes) {
	return `(xena-query {:select ["position (2)" "position" "exonCount" "exonStarts" "exonEnds" "name2"]\n` +
		   `             :from [${quote(dsID)}]\n` +
		   `             :where [:in :any "name2" ${arrayfmt(genes)}]})`;
}

function gene_position(dsID, gene) {
	return `(car ((xena-query {:select ["position"] :from [${quote(dsID)}] :where [:in :any "name2" ${arrayfmt([gene])}]}) "position"))`;
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

function dataset_by_name(host, name) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_query(name))
	).map(_.compose(_.partial(xena_dataset_list_transform, host),
					json_resp))
	.catch(Rx.Observable.return([]));  // XXX display message?
}

function dataset_text (host, ds) {
	return Rx.DOM.ajax(
		xena_post(host, dataset_query(ds))
	).map(json_resp);
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
		xena_post(host, dataset_string(ds))
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

// support for hg18/CRCh36, hg19/CRCh37
var refGene = {
	hg18: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	GRCh36: {host: 'https://reference.xenahubs.net', name: 'refgene_good_hg18'},
	hg19: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'},
	GRCh37: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg19'},
	hg38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'},
	GRCh38: {host: 'https://reference.xenahubs.net', name: 'gencode_good_hg38'}
};

function refGene_attrs(row) {
	return {
		name2: row.name2[0],
		strand: row.position.strand,
		txStart: row.position.chromstart,
		txEnd: row.position.chromend,
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
	return Rx.DOM.ajax(
		xena_post(host, gene_position(name, gene))
	).map(json_resp).map(({strand}) => strand);
}

var probemap_gene_strand = (host, probemap, gene) =>
	dataset_metadata(host, probemap).flatMap(({assembly}) =>
		refGene_gene_strand(refGene[assembly ? assembly : 'hg19'], gene));

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
	dataset_string,
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
	dataset_metadata,
	dataset_samples,
	dataset_feature_detail,
	all_samples,
	all_cohorts,
	dataset_by_name,
	dataset_text,
	probemap_gene_strand,

	sparse_data_match_genes,
	sparse_data_values,
	refGene_exon_values,
	refGene_exon_case,
	match_fields,
	test_host,
	refGene
};
