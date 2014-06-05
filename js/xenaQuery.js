/*global define: false */

define(['rx.dom', 'underscore_ext'], function (Rx, _) {
	var dataset_list_query;

	function json_resp(xhr) {
		return JSON.parse(xhr.response);
	}

	function xena_dataset_list_transform(host, list) {
		return _.map(list, function (ds) {
			return {
				dsID: host + '/' + ds.NAME,
				title: ds.SHORTTITLE || ds.NAME,
				// dataSubType is not the right thing to be using in this
				// file, but so long as it's here, check for a probemap
				// to see if it has a gene view.
				dataSubType: ds.PROBEMAP ? 'cna' : 'clinical'
			};
		});
	}

	dataset_list_query =
		'(query {:select [:name :shorttitle :probemap] :from [:experiments]})';

	function quote(s) {
		return '"' + s + '"'; // XXX should escape "
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

	function dataset_list(servers) {
		return Rx.Observable.zipArray(_.map(servers, function (s) {
			return Rx.DOM.Request.ajax(
				xena_get(s.url, dataset_list_query)
			).map(
				_.compose(_.partial(xena_dataset_list_transform, s.url), json_resp)
			).catch(Rx.Observable.return([]));
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

	return {
		parse_host: parse_host,
		dataset_list: dataset_list,
		feature_list: feature_list,
		find_dataset: find_dataset
	};

});
