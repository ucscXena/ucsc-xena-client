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
			return [f.NAME, f.SHORTTITLE || f.NAME];
		}));
	}

	function xena_dataset_list_transform(host, list) {
		return _.map(list, function (ds) {
			var text = JSON.parse(ds.TEXT) || {};

			// merge curated fields over raw metadata
			// XXX note that we're case sensitive on raw metadata
			ds = _.extend(text, _.dissoc(ds, 'TEXT'));
			return {
				dsID: host + '/' + ds.NAME,
				title: ds.label || ds.NAME,
				// XXX wonky fix to work around dataSubType.
				// Use basename of ds.DATASUBTYPE if it's there. Otherwise
				// default to cna if there's a gene view, and clinical otherwise.
				dataSubType: ds.DATASUBTYPE ?
					ds.DATASUBTYPE.split(/[\/]/).reverse()[0] :
					(ds.PROBEMAP ? 'cna' : 'clinical')
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

	function all_samples_query(cohort) {
		return '(query {:select [:%distinct.exp_samples.name] ' +
		       '        :from [:exp_samples] ' +
		       '        :where [:in :experiments_id {:select [:id] ' +
		       '                                     :from [:experiments] ' +
		       '                                     :where [:= :cohort ' + quote_cohort(cohort) + ']}]})';
	}

	function all_cohorts_query() {
		return '(query {:select [:name [#sql/call [:ifnull :cohort "' + null_cohort + '"] :cohort]] ' +
		       '        :from [:experiments]})';
	}

	function dataset_list_query(cohort) {
		return  '(query {:select [:name :shorttitle :datasubtype :probemap :text] ' +
				'        :from [:experiments] ' +
				'        :where [:= :cohort ' + quote_cohort(cohort) + ']})';
	}

	function dataset_probe_string(dataset, samples, probes) {
		return '(fetch (quote ({' +
					['table', quote(dataset),
					'columns', listfmt(probes),
					'samples', listfmt(samples)].join(' ')
					+ '})))';
	}

	function dataset_gene_string(dataset, samples, genes) {
		return '((fn [probes merge-scores avg] ' +
			'     (avg ' +
			'       (group-by :GENE ' +
			'         (merge-scores ' +
			'           probes ' +
			'           (fetch (cons ' +
			'                   (assoc {table ' + quote(dataset) +
			'                           samples ' + arrayfmt(samples) + '} ' +
			'                          (quote columns) (map :PROBE probes)) ' +
			'                   (quote ()))))))) ' +
			'     (query {:select [:P.gene :probe] ' +
			'             :from [[{:select [:gene :probemap_probes_id] ' +
			'                      :from [:probemap_genes] ' +
			'                      :join [{:table [[[:name :varchar ' + arrayfmt(genes) + ']] :T]} [:= :T.name :probemap_genes.gene]] ' +
			'                      :where [:= :probemaps_id {:select [:id] ' +
			'                                                :from [:probemaps] ' +
			'                                                :where [:= :name {:select [:probemap] ' +
			'                                                                  :from [:experiments] ' +
			'                                                                  :where [:= :name ' + quote(dataset) + ']}]}]} :P]] ' +
			'             :left-join [:probemap_probes [:= :probemap_probes.id :probemap_probes_id]]}) ' +
			'     (fn [probes scores] ' +
			'         (map (fn [p s] (assoc p :SCORES s)) probes scores)) ' +
			'     (fn [genes] (map (fn [gp] (assoc {} ' +
			'                                      :GENE (car gp) ' +
			'                                      :SCORES (mean ' +
			'                                               (map :SCORES (car (cdr gp))) ' +
			'                                               0))) ' +
			'                      genes))) ';
	}

	function dataset_string(dataset) {
		return  '(:TEXT (car (query {:select [:text] ' +
				'                    :from [:experiments] ' +
				'                    :where [:= name ' + quote(dataset) + ']})))';
	}

	function feature_list_query(dataset) {
		return  '(query {:select [:probes.name :features.shorttitle] ' +
				'        :from [:probes] ' +
				'        :where [:= :eid {:select [:id] ' +
				'                         :from [:experiments] ' +
				'                         :where [:= :name ' + quote(dataset) + ']}] ' +
				'        :left-join [:features [:= :features.probes_id :probes.id]]})';
	}

	// XXX drop (quote)
	function features_string(dataset, probes) {
		return  '(query (quote ' +
				'{:select [:P.name :features.*] ' +
				' :from [[{:select [:probes.name :probes.id] ' +
				'          :from [:probes] ' +
				'          :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :probes.name]] ' +
				'          :where [:= :eid {:select [:id] ' +
				'                           :from [:experiments] ' +
				'                           :where [:= :name ' + quote(dataset) + ']}]} :P]] ' +
				' :left-join [:features [:= :features.probes_id :P.id]]}))';
	}

	// XXX drop (quote)
	function codes_string(dataset, probes) {
		return '(query (quote ' +
			'{:select [:P.name [#sql/call [:group_concat :value :order :ordering :separator #sql/call [:chr 9]] :codes]] ' +
			' :from [[{:select [:probes.id :probes.name] ' +
			'          :from [:probes] ' +
			'          :join [{:table [[[:name :varchar ' + arrayfmt(probes) + ']] :T]} [:= :T.name :probes.name]] ' +
			'          :where [:= :eid {:select [:id] ' +
			'                           :from [:experiments] ' +
			'                           :where [:= :name ' + quote(dataset) + ']}]} :P]] ' +
			' :left-join [:features [:= :features.probes_id :P.id] ' +
			'             :codes [:= :features.id :features_id]] ' +
			' :group-by [:P.id]}))';
	}

	function sparse_data_string(dataset, samples, genes) {
		return 'sparse_exon_query'; // TODO implement  after data is on server
	}

	function refGene_exon_string(genes) {
		return 'refGene_exon_string'; // TODO implement after data is on server
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

	function all_samples(host, cohort) {
		return Rx.DOM.Request.ajax(
			xena_get(host, all_samples_query(cohort))
		).map(_.compose(function (l) { return _.pluck(l, 'NAME'); }, json_resp))
		.catch(Rx.Observable.return([])); // XXX display message?
	}

	function all_cohorts(host) {
		return Rx.DOM.Request.ajax(
			xena_get(host, all_cohorts_query())
		).map(_.compose(function (l) { return _.pluck(l, 'COHORT'); }, json_resp))
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
		dataset_probe_string: dataset_probe_string,
		sparse_data_string: sparse_data_string,
		refGene_exon_string: refGene_exon_string,

		// query prep:
		dataset_list: dataset_list,
		feature_list: feature_list,
		find_dataset: find_dataset,
		all_samples: all_samples,
		all_cohorts: all_cohorts
	};
});
