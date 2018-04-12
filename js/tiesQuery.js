'use strict';
var Rx = require('./rx');

var docs = samples =>  Rx.Observable.ajax({
        url: '/api/ties/documents/list',
        headers: {'Content-Type': 'text/plain' },
        body: JSON.stringify({patientIds: samples}),
        responseType: 'text',
        method: 'POST'
    }).map(({response}) => JSON.parse(response).results);

var doc = id =>
	Rx.Observable.ajax({
		url: `/api/ties/documents/${id}`,
		headers: {'Content-Type': 'text/plain' },
		responseType: 'text',
		method: 'GET'
	}).map(result => JSON.parse(result.response));

// XXX Currently, no way to limit by sample id?
var conceptMatches = (patients, concept) =>
	Rx.Observable.ajax({
		url: '/api/ties/query/',
        body: {
            concept,
            limit: 1000 * 1000, // try to defeat limit
        },
		responseType: 'text',
		method: 'POST'
	}).map(result => JSON.parse(result.response).results);

var textMatches = (patients, text) =>
	Rx.Observable.ajax({
		url: '/api/ties/query/',
        body: {
            text,
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

var goodConcepts = () =>
	Rx.Observable.create(observer => {
		require.ensure(['./tiesConcepts.json'], () => {
			var concepts = require('./tiesConcepts.json');
			// defer to avoid reducer re-entry
			setTimeout(() => observer.next(concepts), 0);
		});
	});

module.exports = {
	docs,
	doc,
	textMatches,
	conceptMatches,
	concepts,
	goodConcepts
};
