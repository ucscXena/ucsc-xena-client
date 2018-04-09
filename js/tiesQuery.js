'use strict';
var Rx = require('./rx');
var {partitionN} = require('./underscore_ext');

var binSize = 1000 * 1000;

var errors = [];

var docQuery = samples =>  Rx.Observable.ajax({
        url: '/api/ties/documents/list',
        headers: {'Content-Type': 'text/plain' },
        body: JSON.stringify({patientIds: samples}),
        responseType: 'text',
        method: 'POST'
    }).map(({response}) => JSON.parse(response).results).catch(() => {
        errors.push(samples[0]);
        return Rx.Observable.of([]);
    });

var concatBin = next =>
    acc => next.map(r => acc.concat(r));

function chaseTail(bins, req, i = 0, acc) {
    return bins.length === i ? acc :
        chaseTail(bins, req, i + 1,
            acc ? acc.flatMap(concatBin(req(bins[i]))) :
            req(bins[i]));
}

var badSamples = ["TCGA-BH-A0B4", "TCGA-BH-A0AY", "TCGA-BH-A0BV", "TCGA-BH-A0DZ", "TCGA-BH-A0BD"];
var filterSamples = l => l.filter(v => badSamples.indexOf(v) === -1);


// XXX get patient list from server, instead of doing string replace.
var docs = samples =>
    chaseTail(
        partitionN(filterSamples(samples), binSize),
        docQuery);

//    .map(r => object(
//                pluck(r, 'patientId'),
//                pluck(r, 'docs').map(docs => pluck(docs, 'id'))));

var doc = id =>
	Rx.Observable.ajax({
		url: `/api/ties/documents/${id}`,
		headers: {'Content-Type': 'text/plain' },
		responseType: 'text',
		method: 'GET'
	}).map(result => JSON.parse(result.response));

// XXX Currently, no way to limit by sample id?
var matches = (patients, term) =>
	Rx.Observable.ajax({
		url: '/api/ties/query/',
        body: {
            concept: term,
            limit: 1000 * 1000, // try to defeat limit
        },
		responseType: 'text',
		method: 'POST'
	}).map(result => JSON.parse(result.response).results);

var concepts = term =>
	Rx.Observable.ajax({
		url: `/api/ties/search/?term=${encodeURIComponent(term)}`,
		responseType: 'text',
		method: 'GET'
	}).map(result => JSON.parse(result.response));

module.exports = {
	docs,
	doc,
	matches,
    concepts
};
