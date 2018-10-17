'use strict';

// Utility script to build minhash for probemaps on the
// reference hub.

var request = require('request');
var Rx = require('rxjs');
var post = Rx.Observable.bindNodeCallback(request.post);
var fs = require('fs');
import {Minhash} from 'minhash';

var refHub = 'https://reference.xenahubs.net';

function minHashFromList(list) {
	var mh = new Minhash();
	list.forEach(p => mh.update(p));
	return mh;
}

function probemapList() {
	var probemaps = `
		(query {:select [:dataset.name :hash]
				:from [:dataset]
				:join [:dataset-source [:= :dataset.id :dataset_id]
					   :source [:= :source.id :source_id]]
				:where [:= :type "probeMap"]}))`;

	return post({
		url: refHub + '/data/',
		body: probemaps
	}).map(([, resp]) => JSON.parse(resp));
}

function probeList(probemap) {
	var probes = `(xena-query {:select ["name"] :from ["${probemap.name}"]})`;
	return post({
		url: refHub + '/data/',
		body: probes
	}).retry(3).map(([, resp]) => {
		try {
			return {...probemap, probes: JSON.parse(resp).name};
		} catch(e) {
			console.log('parsing error ', resp.slice(0, 1000));
			process.exit();
		}
	});
}

function buildFilters() {
	var out = fs.openSync('probemapMinHashes', 'w');
	var first = true;
	probemapList().flatMap(probemaps =>
			Rx.Observable.merge(...probemaps.map(probeList)))
		.subscribe(({name, probes}) => {
			console.log(name);
			fs.writeSync(out, first ? '[' : ',');
			var mh = minHashFromList(probes);
			fs.writeSync(out, JSON.stringify({name, hash: mh.hashvalues}));
			first = false;
		}, err => {console.log('error', err);},
		() => {
			fs.writeSync(out, ']');
			fs.closeSync(out);
		});
}

buildFilters();
