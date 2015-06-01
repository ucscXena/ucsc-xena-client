/*global require: false, module: false */
'use strict';
var ga4gh = require('ga4gh-rxjs');
var clinvarMeta = require('./metadataStub');
var Rx = require('rx');
require('rx.experimental');
var _ = require('./underscore_ext');

// {url, dataset, count}  --- ask callSetIds
function callSets(url, dataset, count){
	return ga4gh.callSets(url, {
		variantSetIds: [dataset],
		pageSize: count
	});
}

// {url, dataset, chrom, start, end, fields}
function variants({url, dataset, chrom, start, end}) {
	if (chrom.slice(0,3)==="chr"){
		chrom=chrom.slice(3);
	}

	return callSets(url, dataset, 1).flatMap(s => {
		var callSetIds = s.callSets.map(obj=> obj.id);
		return ga4gh.all.variants(url, {
			variantSetIds: [dataset],
			callSetIds: callSetIds,
			pageSize: 1000,
			start: start,
			end: end,
			referenceName: chrom
		}).map(arr => { _.each(arr, v => v.start++); return arr; });
	});
}


function variantSetsQuery (url) {
	return ga4gh.all.variantSets(url);
}

function metadata(host, dataset) {
	// stub, until the server is working
	var {variantSets} = clinvarMeta;
	//var md = _.find(variantSets, ds => ds.id === dataset).metadata;
	return Rx.Observable.return(variantSets);
}

module.exports = {
	variants: variants,
	variantSetsQuery: variantSetsQuery,
	metadata: metadata
};
