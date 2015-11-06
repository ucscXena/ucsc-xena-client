/*eslint strict: [2, "function"] */
/*eslint camelcase: 0, no-multi-spaces: 0, no-mixed-spaces-and-tabs: 0 */
/*global define: false */

define(['rx-dom', 'underscore_ext', 'rx.binding'], function (Rx, _) {
	'use strict';

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
			return undefined;
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
			defport = '7223',
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
	function reqObj(req, fn) { // TODO may not belong in this file
		return {
			id: JSON.stringify(req),
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

	function dataset_list_query(cohort) {
		return '(query {:select [:name :type :datasubtype :probemap :text :status]\n' +
		       '        :from [:dataset]\n' +
		       '        :where [:= :cohort ' + quote_cohort(cohort) + ']})';
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

	function field_bounds_string(dataset, fields) {
		return '(let [dataset ' + quote(dataset) + '\n' +
		       '      fields ' + arrayfmt(fields) + '\n' +
		       '      rows (- (:rows (car (query {:select [:rows] :from [:dataset]\n' +
		       '                                  :where [:= :dataset.name dataset]}))) 1)\n' +
		       '      field_ids (map\n' +
		       '                  :id\n' +
		       '                  (query {:select [:field.id] :from [:field]\n' +
		       '                          :join [:dataset [:= :dataset.id :dataset_id]]\n' +
		       '                          :where [:and\n' +
		       '                                  [:= :dataset.name dataset]\n' +
		       '                                  [:in :field.name fields]]}))\n' +
		       '      bounds (fn [id]\n' +
		       '                 (let [c #sql/call [:unpack id :x]]\n' +
		       '                   (car (query {:select [[#sql/call [:max c] :max] [#sql/call [:min c] :min]]\n' +
		       '                                :from [#sql/call [:system_range 0 rows]]\n' +
		       '                                :where [:not [:=  c "NaN"]]}))))]\n' +
		       '      (map (fn [x y] (assoc y :field x)) fields (map bounds field_ids)))';
	}

	function dataset_gene_probes_string(dataset, samples, gene) {
		return '(let [getfield (fn [dsID field]\n' +
		       '                 (:id (car (query {:select [:id]\n' +
		       '                                   :from [:field]\n' +
		       '                                   :where [:and [:= :name field] [:= :dataset_id dsID]]}))))\n' +
		       '      pmid (:id (car (query {:select [:d2.id]\n' +
		       '                             :from [:dataset]\n' +
		       '                             :join [[:dataset :d2] [:= :dataset.probemap :d2.name]]\n' +
		       '                             :where [:= :dataset.name ' + quote(dataset) + ']})))\n' +
		       '      genes (getfield pmid "genes")\n' +
		       '      name (getfield pmid "name")\n' +
		       '      probes (map :probe (query {:select [[#sql/call [:unpackValue name :row] :probe]]\n' +
		       '                                 :from [:field_gene]\n' +
		       '                                 :where [:and [:= :field_id genes] [:= :gene ' + quote(gene) + ']]}))]\n' +
		       '  [probes\n' +
		       '    (fetch [{:table ' + quote(dataset) + '\n' +
		       '             :samples ' + arrayfmt(samples) + '\n' +
		       '             :columns probes}])])';
	}


	function dataset_gene_string(dataset, samples, genes) {
		return '(let [average (fn [genes] (map (fn [gp] {:gene (car gp)\n' +
		       '                                         :scores (mean (map :scores (car (cdr gp))) 0)})\n' +
		       '                               genes))\n' +
		       '      merge-scores (fn [probes scores]\n' +
		       '                     (map (fn [p s] (assoc p :scores s)) probes scores))\n' +
		       '      getfield (fn [dsID field]\n' +
		       '                 (:id (car (query {:select [:id]\n' +
		       '                                   :from [:field]\n' +
		       '                                   :where [:and [:= :name field] [:= :dataset_id dsID]]}))))\n' +
		       '      pmid (:id (car (query {:select [:d2.id]\n' +
		       '                             :from [:dataset]\n' +
		       '                             :join [[:dataset :d2] [:= :dataset.probemap :d2.name]]\n' +
		       '                             :where [:= :dataset.name ' + quote(dataset) + ']})))\n' +
		       '      genes (getfield pmid "genes")\n' +
		       '      name (getfield pmid "name")\n' +
		       '      probes (query {:select [:gene [#sql/call [:unpackValue name :row] :probe]]\n' +
		       '                     :from [:field_gene]\n' +
		       '                     :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ']] :T]} [:= :T.name :field_gene.gene]]\n' +
		       '                     :where [:= :field_id genes]})]\n' +
		       '  (average (group-by :gene (merge-scores probes (fetch [{:table ' + quote(dataset) + '\n' +
		       '                                                         :samples ' + arrayfmt(samples) + '\n' +
		       '                                                         :columns (map :probe probes)}])))))';
	}

	// It might be possible to better optimize this join. The scan counts seem high.
	function sparse_data_string(dataset, samples, genes) {
		return '(let [getfield (fn [field]\n' +
		       '                 (:id (car (query {:select [:field.id]\n' +
		       '                                   :from [:dataset]\n' +
		       '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		       '                                   :where [:and [:= :field.name field] [:= :dataset.name ' + quote(dataset) + ']]}))))\n' +
		       '      unpack (fn [field] [#sql/call [:unpack (getfield field) :field_gene.row] field])\n' +
		       '      unpackValue (fn [field] [#sql/call [:unpackValue (getfield field) :field_gene.row] field])\n' +
		       '      genes (getfield "genes")\n' +
		       '      sampleID (getfield "sampleID")\n' +
		       '      position (getfield "position")]\n' +
		       '  {:samples (map :value (query {:select [:value]\n' +
		       '                                :from [:field]\n' +
		       '                                :join [:code [:= :field.id :field_id]]\n' +
		       '                                :where [:and [:in :value ' + arrayfmt(samples) + '][:= :field_id sampleID]]}))\n' +
		       '   :rows (query {:select [:chrom :chromStart :chromEnd :gene [#sql/call ["unpackValue" sampleID :field_gene.row] :sampleID]' +
		       '                          (unpackValue "ref")\n' +
		       '                          (unpackValue "alt")\n' +
		       '                          (unpackValue "effect")\n' +
		       '                          (unpack "dna-vaf")\n' +
		       '                          (unpack "rna-vaf")\n' +
		       '                          (unpackValue "amino-acid")]\n' +
		       '                 :from [:field_gene]\n' +
		       '                 :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ']] :T]} [:= :T.name :field_gene.gene]\n' +
		       '                        :field_position [:= :field_position.row :field_gene.row]]\n' +
		       '                 :where [:and\n' +
		       '                         [:= :field_gene.field_id genes]\n' +
		       '                         [:= :field_position.field_id position]\n' +
		       '                         [:in #sql/call ["unpackValue" sampleID :field_gene.row] ' + arrayfmt(samples) + ']]})})';
	}

	function sparse_data_example_string(dataset, count) {
		return '(let [getfield (fn [field]\n' +
		       '                 (:id (car (query {:select [:field.id]\n' +
		       '                                   :from [:dataset]\n' +
		       '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		       '                                   :where [:and [:= :field.name field] [:= :dataset.name ' + quote(dataset) + ']]}))))\n' +
		       '      unpack (fn [field] [#sql/call [:unpack (getfield field) :field_gene.row] field])\n' +
		       '      unpackValue (fn [field] [#sql/call [:unpackValue (getfield field) :field_gene.row] field])\n' +
		       '      genes (getfield "genes")\n' +
		       '      sampleID (getfield "sampleID")\n' +
		       '      position (getfield "position")]\n' +
		       '  {:rows (query {:select [:chrom :chromStart :chromEnd :gene [#sql/call ["unpackValue" sampleID :field_gene.row] :sampleID]' +
		       '                          (unpackValue "ref")\n' +
		       '                          (unpackValue "alt")\n' +
		       '                          (unpackValue "effect")\n' +
		       '                          (unpack "dna-vaf")\n' +
		       '                          (unpack "rna-vaf")\n' +
		       '                          (unpackValue "amino-acid")]\n' +
		       '                 :from [:field_gene]\n' +
		       '                 :join [:field_position [:= :field_position.row :field_gene.row]]\n' +
		       '                 :limit ' + count + '\n' +
		       '                 :where [:and\n' +
		       '                         [:= :field_gene.field_id genes]\n' +
		       '                         [:= :field_position.field_id position]]})})';
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

	function refGene_exon_string(genes) {
		return '(let [getfield (fn [field]\n' +
		       '                 (:id (car (query {:select [:field.id]\n' +
		       '                                   :from [:dataset]\n' +
		       '                                   :join [:field [:= :dataset.id :field.dataset_id]]\n' +
		       '                                   :where [:and [:= :field.name field] [:= :dataset.name "common/GB/refgene_good"]]}))))\n' +
		       '      unpack (fn [field] [#sql/call [:unpack (getfield field) :field_gene.row] field])\n' +
		       '      unpackValue (fn [field] [#sql/call [:unpackValue (getfield field) :field_gene.row] field])\n' +
		       '      tx (getfield "position")\n' +
		       '      cds (getfield "position (2)")\n' +
		       '      name2 (getfield "name2")]\n' +
		       '  (query {:select [[:gene :name2]\n' +
		       '                   [:tx.strand :strand]\n' +
		       '                   [:tx.chromStart :txStart]\n' +
		       '                   [:cds.chromStart :cdsStart]\n' +
		       '                   (unpack "exonCount")\n' +
		       '                   (unpackValue "exonStarts")\n' +
		       '                   (unpackValue "exonEnds")\n' +
		       '                   [:cds.chromEnd :cdsEnd]\n' +
		       '                   [:tx.chromEnd :txEnd]]\n' +
		       '          :from [:field_gene]\n' +
		       '          :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ' ]] :T]} [:= :T.name :field_gene.gene]\n' +
		       '                 [:field_position :tx] [:= :tx.row :field_gene.row]\n' +
		       '                 [:field_position :cds] [:= :cds.row :field_gene.row]]\n' +
		       '          :where [:and [:= :field_gene.field_id name2]\n' +
		       '                       [:= :tx.field_id tx]\n' +
		       '                       [:= :cds.field_id cds]]}))';
	}

	// QUERY PREP

	// XXX Should consider making sources indexed so we can do simple
	// lookups. Would need to update haml/columnEditBasic.haml.
	function find_dataset(sources, hdsID) {
		return _.findValue(sources, function (source) {
			return _.findWhere(source.datasets, {dsID: hdsID});
		});
	}

	function dataset_list(servers, cohort) {
		return Rx.Observable.zipArray(_.map(servers, function (s) {
			return Rx.DOM.ajax(
				xena_post(s, dataset_list_query(cohort))
			).map(
				_.compose(_.partial(xena_dataset_list_transform, s), json_resp)
			).catch(Rx.Observable.return([])); // XXX display message?
		})).map(function (datasets_by_server) {
			return _.map(servers, function (server, i) {
				return {server: server, datasets: datasets_by_server[i]};
			});
		});
	}

	function code_list(host, ds, probes) {
		return Rx.DOM.ajax(
			xena_post(host, codes_string(ds, probes))
		).select(indexCodes);
	}

	function indexBounds(bounds) {
		return _.object(_.map(bounds, function (row) {
			return [row.field, row];
		}));
	}

	function field_bounds(host, ds, probes) {
		return Rx.DOM.ajax(
			xena_post(host, field_bounds_string(ds, probes))
		).map(_.compose(indexBounds, json_resp));
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

	function all_samples(host, cohort) {
		return Rx.DOM.ajax(
			xena_post(host, all_samples_query(cohort))
		).map(json_resp)
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	// XXX Have to use POST here because the genome-cancer reverse proxy fails
	// on odd characters, such as "/".
	// http://stackoverflow.com/questions/3235219/urlencoded-forward-slash-is-breaking-url
	function all_cohorts(host) {
		return Rx.DOM.ajax(
			xena_post(host, all_cohorts_query())
		).map(json_resp)
		.catch(Rx.Observable.return([])); // XXX display message?
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

	return {
		// helpers:
		dsID_fn: dsID_fn,
		parse_host: parse_host,
		server_url: server_url,
		json_resp: json_resp,
		nanstr: nanstr,
		reqObj: reqObj,
		xena_post: xena_post,

		// query strings:
		codes_string: codes_string,
		features_string: features_string,
		dataset_string: dataset_string,
		dataset_gene_string: dataset_gene_string,
		dataset_gene_probes_string: dataset_gene_probes_string,
		dataset_probe_string: dataset_probe_string,
		sparse_data_string: sparse_data_string,
		refGene_exon_string: refGene_exon_string,
		field_bounds_string: field_bounds_string,

		// query prep:
		dataset_list: dataset_list,
		feature_list: feature_list,
		code_list: code_list,
		dataset_field_examples: dataset_field_examples,
		dataset_field: dataset_field,
		sparse_data_examples: sparse_data_examples,
		dataset_probe_values: dataset_probe_values,
		dataset_gene_probe_values: dataset_gene_probe_values, // XXX mk plural genes?
		dataset_genes_values: dataset_genes_values,
		dataset_metadata: dataset_metadata,
		find_dataset: find_dataset,
		dataset_samples: dataset_samples,
		dataset_feature_detail: dataset_feature_detail,
		all_samples: all_samples,
		all_cohorts: all_cohorts,
		dataset_by_name: dataset_by_name,
		dataset_text: dataset_text,
		field_bounds: field_bounds,

		test_host: test_host
	};
});
