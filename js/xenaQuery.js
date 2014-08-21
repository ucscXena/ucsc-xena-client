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
		if (v === "NaN") {
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
		return dsID.match(/([^\/]*\/\/[^\/]*)\/(.*)/);
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
		return '(map :value ' +
		       '  (query ' +
		       '    {:select [:value] ' +
		       '     :from [:dataset] ' +
		       '     :where [:= :name ' + quote(dataset) + '] ' +
		       '     :left-join ' +
		       '       [[{:select [:id :dataset_id] ' +
		       '          :from [:field] ' +
		       '          :where [:= :name "sampleID"]} :F] [:= :dataset.id :dataset_id] ' +
		       '        :code [:= :F.id :field_id]]}))';
	}

	function all_samples_query(cohort) {
		return '(map :value ' +
		       '  (query ' +
		       '    {:select [:%distinct.value] ' +
		       '     :from [:dataset] ' +
		       '     :where [:= :cohort ' + quote_cohort(cohort) + '] ' +
		       '     :left-join ' +
		       '       [[{:select [:id :dataset_id] ' +
		       '          :from [:field] ' +
		       '          :where [:= :name "sampleID"]} :F] [:= :dataset.id :dataset_id] ' +
		       '        :code [:= :F.id :field_id]]}))';
	}

	function all_cohorts_query() {
		return '(query {:select [:name [#sql/call [:ifnull :cohort "' + null_cohort + '"] :cohort]] ' +
		       '        :from [:dataset]})';
	}

	function dataset_list_query(cohort) {
		return  '(query {:select [:name :shorttitle :type :datasubtype :probemap :text] ' +
				'        :from [:dataset] ' +
				'        :where [:= :cohort ' + quote_cohort(cohort) + ']})';
	}

	function dataset_probe_string(dataset, samples, probes) {
		return '(fetch (quote ({' +
					[':table', quote(dataset),
					':columns', listfmt(probes),
					':samples', listfmt(samples)].join(' ')
					+ '})))';
	}

	function dataset_gene_probes_string(dataset, samples, gene) {
		return '(let [getfield (fn [dsID field] ' +
		'                        (:id (car (query {:select [:id] ' +
		'                                          :from [:field] ' +
		'                                          :where [:and [:= :name field] [:= :dataset_id dsID]]})))) ' +
		'             pmid (:id (car (query {:select [:d2.id] ' +
		'                                    :from [:dataset] ' +
		'                                    :join [[:dataset :d2] [:= :dataset.probemap :d2.name]] ' +
		'                                    :where [:= :dataset.name ' + quote(dataset) + ']}))) ' +
		'             genes (getfield pmid "genes") ' +
		'             name (getfield pmid "name") ' +
		'             probes (map :probe (query {:select [[#sql/call [:unpackValue name :row] :probe]] ' +
		'                                        :from [:field_gene] ' +
		'                                        :where [:and [:= :field_id genes] [:= :gene ' + quote(gene) + ']]}))] ' +
		'         [probes ' +
		'           (fetch [{:table ' + quote(dataset) + ' ' +
		'                    :samples ' + arrayfmt(samples) + ' ' +
		'                    :columns probes}])]) ';
	}


	function dataset_gene_string(dataset, samples, genes) {
		return '(let [average (fn [genes] (map (fn [gp] {:gene (car gp) ' +
		'                                                :scores (mean (map :scores (car (cdr gp))) 0)}) ' +
		'                                      genes)) ' +
		'             merge-scores (fn [probes scores] ' +
		'                            (map (fn [p s] (assoc p :scores s)) probes scores)) ' +
		'             getfield (fn [dsID field] ' +
		'                        (:id (car (query {:select [:id] ' +
		'                                          :from [:field] ' +
		'                                          :where [:and [:= :name field] [:= :dataset_id dsID]]})))) ' +
		'             pmid (:id (car (query {:select [:d2.id] ' +
		'                                    :from [:dataset] ' +
		'                                    :join [[:dataset :d2] [:= :dataset.probemap :d2.name]] ' +
		'                                    :where [:= :dataset.name ' + quote(dataset) + ']}))) ' +
		'             genes (getfield pmid "genes") ' +
		'             name (getfield pmid "name") ' +
		'             probes (query {:select [:gene [#sql/call [:unpackValue name :row] :probe]] ' +
		'                            :from [:field_gene] ' +
		'                            :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ']] :T]} [:= :T.name :field_gene.gene]] ' +
		'                            :where [:= :field_id genes]})] ' +
		'         (average (group-by :gene (merge-scores probes (fetch [{:table ' + quote(dataset) + ' ' +
		'                                                                :samples ' + arrayfmt(samples) + ' ' +
		'                                                                :columns (map :probe probes)}])))))';
	}

	// It might be possible to better optimize this join. The scan counts seem high.
	function sparse_data_string(dataset, samples, genes) {
		return '(let [getfield (fn [field] ' +
		'                        (:id (car (query {:select [:field.id] ' +
		'                                          :from [:dataset] ' +
		'                                          :join [:field [:= :dataset.id :field.dataset_id]] ' +
		'                                          :where [:and [:= :field.name field] [:= :dataset.name ' + quote(dataset) + ']]})))) ' +
		'             genes (getfield "genes") ' +
		'             sampleID (getfield "sampleID") ' +
		'             position (getfield "position") ' +
		'             alt (getfield "alt") ' +
		'             effect (getfield "effect") ' +
		'             ref (getfield "ref") ' +
		'             dna-vaf (getfield "dna-vaf") ' +
		'             amino-acid (getfield "amino-acid") ' +
		'             rna-vaf (getfield "rna-vaf")] ' +
		'         {:samples (map :value (query {:select [:value] ' +
	    '                                       :from [:field] ' +
	    '                                       :join [:code [:= :field.id :field_id] ' +
		'                                              {:table [[[:sampleID :varchar ' + arrayfmt(samples) + ']] :T]} [:= :T.sampleID :value]] ' +
		'                                       :where [:= :field_id sampleID]})) ' +
		'          :rows (query {:select [:chrom :chromStart :chromEnd :gene [#sql/call ["unpackValue" sampleID :field_gene.row] :sampleID]' +
		'                                 [#sql/call ["unpackValue" ref :field_gene.row] :ref] ' +
		'                                 [#sql/call ["unpackValue" alt :field_gene.row] :alt] ' +
		'                                 [#sql/call ["unpackValue" effect :field_gene.row] :effect] ' +
		'                                 [#sql/call ["unpack" dna-vaf :field_gene.row] :dna-vaf] ' +
		'                                 [#sql/call ["unpack" rna-vaf :field_gene.row] :rna-vaf] ' +
		'                                 [#sql/call ["unpackValue" amino-acid :field_gene.row] :amino-acid]] ' +
		'                        :from [:field_gene] ' +
		'                        :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ']] :T]} [:= :T.name :field_gene.gene] ' +
		'                               :field_position [:= :field_position.row :field_gene.row]] ' +
		'                        :where [:and ' +
		'                                [:= :field_gene.field_id genes] ' +
		'                                [:= :field_position.field_id position] ' +
		'                                [:in #sql/call ["unpackValue" sampleID :field_gene.row] ' + arrayfmt(samples) + ']]})})';
	}

	function dataset_string(dataset) {
		return  '(:text (car (query {:select [:text] ' +
				'                    :from [:dataset] ' +
				'                    :where [:= :name ' + quote(dataset) + ']})))';
	}

	function feature_list_query(dataset) {
		return  '(query {:select [:field.name :feature.shorttitle] ' +
				'        :from [:field] ' +
				'        :where [:= :dataset_id {:select [:id] ' +
				'                         :from [:dataset] ' +
				'                         :where [:= :name ' + quote(dataset) + ']}] ' +
				'        :left-join [:feature [:= :feature.field_id :field.id]]})';
	}

	// XXX drop (quote)
	function features_string(dataset, probes) {
		return  '(query (quote ' +
				'{:select [:P.name :feature.*] ' +
				' :from [[{:select [:field.name :field.id] ' +
				'          :from [:field] ' +
				'          :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :field.name]] ' +
				'          :where [:= :dataset_id {:select [:id] ' +
				'                           :from [:dataset] ' +
				'                           :where [:= :name ' + quote(dataset) + ']}]} :P]] ' +
				' :left-join [:feature [:= :feature.field_id :P.id]]}))';
	}

	// XXX drop (quote)
	function codes_string(dataset, probes) {
		return '(query (quote ' +
			'{:select [:P.name [#sql/call [:group_concat :value :order :ordering :separator #sql/call [:chr 9]] :code]] ' +
			' :from [[{:select [:field.id :field.name] ' +
			'          :from [:field] ' +
			'          :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :field.name]] ' +
			'          :where [:= :dataset_id {:select [:id] ' +
			'                           :from [:dataset] ' +
			'                           :where [:= :name ' + quote(dataset) + ']}]} :P]] ' +
			' :left-join [:code [:= :P.id :field_id]] ' +
			' :group-by [:P.id]}))';
	}

	function refGene_exon_string(genes) {
		return 'refGene_exon_string' + genes[0]; // TODO implement after data is on server
	}

	// QUERY PREP

	// XXX Should consider making sources indexed so we can do simple
	// lookups. Would need to update haml/columnEditBasic.haml.
	function find_dataset(sources, hdsID) {
		var hostdsID = parse_host(hdsID),
			host = hostdsID[1],
			dsID = hostdsID[2],
			source = _.findWhere(sources, {url: host});
		return _.findWhere(source.datasets, {dsID: hdsID});
	}

	function dataset_list(servers, cohort) {
		return Rx.Observable.zipArray(_.map(servers, function (s) {
			return Rx.DOM.Request.ajax(
				xena_get(s.url, dataset_list_query(cohort))
			).map(
				_.compose(_.partial(xena_dataset_list_transform, s.url), json_resp)
			).catch(Rx.Observable.return([])); // XXX display message?
		}));
	}

	function feature_list(dsID) {
		var hostds = parse_host(dsID),
			host = hostds[1],
			ds = hostds[2];
		return Rx.DOM.Request.ajax(
			xena_get(host, feature_list_query(ds))
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
			xena_get(host, dataset_samples_query(ds))
		).map(json_resp);
	}

	function all_samples(host, cohort) {
		return Rx.DOM.Request.ajax(
			xena_get(host, all_samples_query(cohort))
		).map(json_resp)
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	function all_cohorts(host) {
		return Rx.DOM.Request.ajax(
			xena_get(host, all_cohorts_query())
		).map(_.compose(function (l) { return _.pluck(l, 'cohort'); }, json_resp))
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	return {
		// helpers:
		parse_host: parse_host,
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
		find_dataset: find_dataset,
		dataset_samples: dataset_samples,
		all_samples: all_samples,
		all_cohorts: all_cohorts
	};
});
