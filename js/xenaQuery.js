/*global define: false */

define(['rx.dom', 'underscore_ext'], function (Rx, _) {
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

	function listfmt(l) {
		return '(' + sep(l) + ')';
	}

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

	// XXX deprecate this
	function parse_host(dsID) {
		return dsID.match(/([^\/]*\/\/[^\/]*)\/(.*)/);
	}

	function parse_server(s) {
		// XXX should throw or otherwise indicate parse error on no match
		var tokens = s.match(/^(https?:\/\/)?([^:]+)(:([0-9]+))?$/),
			host = tokens[2],
			prod = (host.indexOf('genome-cancer.ucsc.edu') === 0),
			defproto = prod ? 'https://' : 'http://',
			proto = tokens[1] || (prod ? 'https://' : 'http://'),
			defport = (prod ? '433' : '7222'),
			port = tokens[4] || defport,
			url = proto + host + ':' + port;

		return {
			title: (proto === defproto ? '' : proto) +
				host +
				(port === defport ? '' : (':' + port)),
			url: url
		};
	}

	function server_title(s) {
		return parse_server(s).title;
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
			query:  Rx.Observable.defer(_.partial(fn, req))
		};
	}

	function indexFeatures(features) {
		return _.object(_.map(features, function (f) {
			return [f.name, f.shorttitle || f.name];
		}));
	}

	function xena_dataset_list_transform(host, list) {
		return _.map(list, function (ds) {
			var text = JSON.parse(ds.text) || {};

			// merge curated fields over raw metadata
			// XXX note that we're case sensitive on raw metadata
			ds = _.extend(text, _.dissoc(ds, 'TEXT'));
			return {
				dsID: host + '/' + ds.name,
				title: ds.label || ds.name,
				type: ds.type,
				probemap: ds.probemap,
				// XXX wonky fix to work around dataSubType.
				// Use basename of ds.datasubtype if it's there. Otherwise
				// default to cna if there's a gene view, and clinical otherwise.
				// Also, copy type mutationVector to dataSubType.
				dataSubType: ds.type === "mutationVector" ? ds.type :
					(ds.datasubtype ?
					 ds.datasubtype.split(/[\/]/).reverse()[0] :
					 (ds.probemap ? 'cna' : 'phenotype'))
			};
		});
	}

	function xena_get(host, query) {
		return {
			url: host + '/data/' + encodeURIComponent(query),
			method: 'GET'
		};
	}

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
		       '     :where [:= :cohort ' + quote_cohort(cohort) + ']\n' +
		       '     :left-join\n' +
		       '       [[{:select [:id :dataset_id]\n' +
		       '          :from [:field]\n' +
		       '          :where [:= :name "sampleID"]} :F] [:= :dataset.id :dataset_id]\n' +
		       '        :code [:= :F.id :field_id]]}))';
	}

	function all_cohorts_query() {
		return '(map :cohort\n' +
		       '  (query\n' +
		       '    {:select [[#sql/call [:distinct #sql/call [:ifnull :cohort "(unassigned)"]] :cohort]]\n' +
			   '     :from [:dataset]}))';
	}

	function dataset_list_query(cohort) {
		return '(query {:select [:name :shorttitle :type :datasubtype :probemap :text]\n' +
		       '        :from [:dataset]\n' +
		       '        :where [:= :cohort ' + quote_cohort(cohort) + ']})';
	}

	function dataset_probe_string(dataset, samples, probes) {
		return '(fetch [{:table ' + quote(dataset) + '\n' +
		       '         :columns ' +  arrayfmt(probes) + '\n' +
		       '         :samples ' + arrayfmt(samples) + '}])';
	}

	function dataset_field_examples_string(dataset) {
		return '(query {:select [:field.name] ' +
			   '        :from [:dataset] ' +
		       '        :join [:field [:= :dataset.id :dataset_id]] ' +
		       '        :where [:= :dataset.name ' + quote(dataset) + '] ' +
               '        :limit 2})';
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
		       '                                :join [:code [:= :field.id :field_id]\n' +
		       '                                       {:table [[[:sampleID :varchar ' + arrayfmt(samples) + ']] :T]} [:= :T.sampleID :value]]\n' +
		       '                                :where [:= :field_id sampleID]}))\n' +
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

	function dataset_string(dataset) {
		return '(:text (car (query {:select [:text]\n' +
		       '                    :from [:dataset]\n' +
		       '                    :where [:= :name ' + quote(dataset) + ']})))';
	}

	function feature_list_query(dataset) {
		return '(query {:select [:field.name :feature.shorttitle]\n' +
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
		var result;
		return _.findValue(sources, function (source) {
			return _.findWhere(source.datasets, {dsID: hdsID});
		});
	}

	function dataset_list(servers, cohort) {
		return Rx.Observable.zipArray(_.map(servers, function (s) {
			return Rx.DOM.Request.ajax(
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

	function dataset_field_examples(dsID) {
		var hostds = parse_host(dsID),
			host = hostds[1],
			ds = hostds[2];
		return Rx.DOM.Request.ajax(
			xena_post(host, dataset_field_examples_string(ds))
		).map(json_resp);
	}

	function dataset_probe_values(dsID, samples, probes) {
		var hostds = parse_host(dsID),
			host = hostds[1],
			ds = hostds[2];
		return Rx.DOM.Request.ajax(
			xena_post(host, dataset_probe_string(ds, samples, probes))
		).map(json_resp);
	}

	function feature_list(dsID) {
		var hostds = parse_host(dsID),
			host = hostds[1],
			ds = hostds[2];
		return Rx.DOM.Request.ajax(
			xena_post(host, feature_list_query(ds))
		).map(_.compose(indexFeatures, json_resp));
	}

	function dataset_samples(dsID) {
		if (dsID === '') { // TODO shouldn't need to handle this
			return Rx.Observable.return([]);
		}
		var hostds = parse_host(dsID),
			host = hostds[1],
			ds = hostds[2];
		return Rx.DOM.Request.ajax(
			xena_post(host, dataset_samples_query(ds))
		).map(json_resp);
	}

	function all_samples(host, cohort) {
		return Rx.DOM.Request.ajax(
			xena_post(host, all_samples_query(cohort))
		).map(json_resp)
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	// XXX Have to use POST here because the genome-cancer reverse proxy fails
	// on odd characters, such as "/".
	// http://stackoverflow.com/questions/3235219/urlencoded-forward-slash-is-breaking-url
	function all_cohorts(host) {
		return Rx.DOM.Request.ajax(
			xena_post(host, all_cohorts_query())
		).map(json_resp)
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	return {
		// helpers:
		parse_host: parse_host,
		server_title: server_title,
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

		// query prep:
		dataset_list: dataset_list,
		feature_list: feature_list,
		dataset_field_examples: dataset_field_examples,
		dataset_probe_values: dataset_probe_values,
		find_dataset: find_dataset,
		dataset_samples: dataset_samples,
		all_samples: all_samples,
		all_cohorts: all_cohorts
	};
});
