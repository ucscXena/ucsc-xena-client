'use strict';

// Utility script to build minhash for cohort samples on public
// hubs

var request = require('request');
var Rx = require('rxjs');
var post = Rx.Observable.bindNodeCallback(request.post);
var fs = require('fs');
import {Minhash} from 'minhash';
var _ = require('underscore');
var request = require('request');
var Rx = require('rxjs');
var post = Rx.Observable.bindNodeCallback(request.post);

var {publicServers, enabledServers} = require('../defaultServers');
var enabledPublicServers = _.intersection(publicServers, enabledServers);

var allCohortsQuery = `
    (map :cohort
	  (query
		{:select [[#sql/call [:distinct #sql/call [:ifnull :cohort "(unassigned)"]] :cohort]]
		 :from [:dataset]}))`;

var cohortSamplesQuery = cohort => `
	(map :value
		  (query
			{:select [:%distinct.value]
			 :from [:dataset]
			 :join [:field [:= :dataset.id :dataset_id]
					:code [:= :field_id :field.id]]
			 :where [:and [:= :cohort "${cohort}"]
						  [:= :field.name "sampleID"]]}))`;

function spy(msg, x) {
	console.log(msg, x);
	return x;
}

var uniq = arrs => [...new Set([].concat(...arrs))];

var cohortList = Rx.Observable.zip(
		...enabledPublicServers.map(host => post({
			url: host + '/data/',
			body: allCohortsQuery
		}).catch(() => Rx.Observable.of([spy('error host', host), '[]']))), (...resps) => uniq(resps.map(([, resp]) => JSON.parse(resp))));//.map(cohorts => cohorts.slice(0, 2));

var sampleList = cohort =>
	Rx.Observable.zip(
		...enabledPublicServers.map(host => post({
			url: host + '/data/',
			body: cohortSamplesQuery(cohort)
		}).catch(() => Rx.Observable.of([host, '[]']))), (...resps) => uniq(resps.map(([, resp]) => JSON.parse(resp))));

function minHashFromList(list) {
	var mh = new Minhash();
	list.forEach(p => mh.update(p));
	return mh;
}

function writeCohortHashes() { //eslint-disable-line no-unused-vars
	var out = fs.openSync('cohortMinHashes', 'w');
	var first = true;
	cohortList.flatMap(cohorts =>
			Rx.Observable.merge(
				...cohorts.map(cohort => sampleList(cohort).map(samples => ({cohort, samples})))))
		.subscribe(({cohort, samples}) => {
			fs.writeSync(out, first ? '[' : ',');
			var mh = minHashFromList(samples);
			fs.writeSync(out, JSON.stringify({name: cohort, hash: mh.hashvalues}));
			first = false;
		}, () => {},
		() => {
			fs.writeSync(out, ']');
			fs.closeSync(out);
		});
}

writeCohortHashes();
