/*global require: false, module: false */
'use strict';

var _ = require('underscore');
var Rx = require('rx-dom');

// XXX should be passed in to each method
var server = "http://ec2-54-148-207-224.us-west-2.compute.amazonaws.com/ga4gh/v0.5.1/";

// XXX need to handle paging in each method

var post = {
//  XXX check rx versions. It's weird that it's modifying this header.
//	headers: {'Content-Type': 'application/json' },
	method: 'POST'
};

function assertions(arr) {
	_.each(arr, ([assertion, msg]) => {
		if (!assertion) {
			throw new Error(msg);
		}
	});
}

// Return list of variantSets, optionally limited by datasetIds
function variantSets(args) {
    args = args || {};
    var datasetIds = args.datasetIds || [];
	return Rx.DOM.ajax(_.extend({
		url: `${server}/variantsets/search`,
		body: {datasetIds: datasetIds}
	}, post)).pluck('response').map(JSON.parse).pluck('variantSets');
}

function validateVariantsSearch({start, end, callSetIds, referenceName, variantSetIds}) {
    callSetIds = callSetIds || [];
	assertions([
		[_.isNumber(start), "start position is not number"],
		[_.isNumber(end), "end position is not number"],
		[_.isArray(callSetIds), "callSetsIds is not array"],
		[_.isString(referenceName), "referenceName is not string"],
		[_.isArray(variantSetIds), "variantSetIds is not array"],
		[start >= 0, "start position is negative"],
		[end >= 0, "end position is negative"],
		[end > start, "end is not greater than start"]
	]);
}

var variantsSearchDefaults = {
	callSetIds: []
};

// {start, end, callSetsIds = [], referenceName, variantSetIds}
function variants(props) {
	var body = _.extend({}, variantsSearchDefaults, props);
	validateVariantsSearch(body);
	return Rx.DOM.ajax(_.extend({
		url: `${server}/variants/search`,
		body: body
	}, post)).pluck('response').map(JSON.parse).pluck('variants');
}

module.exports = {
	variantSets: variantSets,
	variants: variants
};
