/*global define: false */

define(['rx.dom', 'underscore_ext'], function (Rx, _) {
	'use strict';

	var null_cohort = '(unassigned)';

	function json_resp(xhr) {
		return JSON.parse(xhr.response);
	}

	function quote(s) {
		return '"' + s + '"'; // XXX should escape "
	}

	// XXX should make this the default quote(), since all null
	// values should be mapped to nil. Should drop null_cohort, and
	// deal with null->"" in the cohort selection UI code. option
	// elements always have string values, so need a special null value.
	function quote_cohort(cohort) {
		return (cohort === null_cohort) ? 'nil' : quote(cohort);
	}

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

	function dataset_list_query(cohort) {
		return  '(query {:select [:name :shorttitle :datasubtype :probemap :text] ' +
				'        :from [:experiments] ' +
				'        :where [:= :cohort ' + quote_cohort(cohort) + ']})';
	}

	function feature_list_query(dataset) {
		return  '(query {:select [:probes.name :features.shorttitle] ' +
				'        :from [:probes] ' +
				'        :where [:= :eid {:select [:id] ' +
				'                         :from [:experiments] ' +
				'                         :where [:= :name ' + quote(dataset) + ']}] ' +
				'        :left-join [:features [:= :features.probes_id :probes.id]]})';
	}

	function indexFeatures(features) {
		return _.object(_.map(features, function (f) {
			return [f.NAME, f.SHORTTITLE || f.NAME];
		}));
	}

	function xena_get(host, query) {
		return {
			url: host + '/data/' + encodeURIComponent(query),
			method: 'GET'
		};
	}

	function parse_host(dsID) {
		return dsID.match(/([^\/]*\/\/[^\/]*)\/(.*)/);
	}

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
		parse_host: parse_host,
		dataset_list: dataset_list,
		feature_list: feature_list,
		find_dataset: find_dataset,
		all_samples: all_samples,
		all_cohorts: all_cohorts
	};

});
