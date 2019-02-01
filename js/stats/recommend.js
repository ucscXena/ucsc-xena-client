'use strict';

var {sortBy} = require('../underscore_ext');
var Minhash = require('minhash/src/minhash');
var rawProbemapHashes = require('json-loader!./probemapMinHashes');
var rawCohortHashes = require('json-loader!./cohortMinHashes');

var inflate = list => list.map(
	({name, hash}) => {
		var mh = new Minhash();
		mh.hashvalues = hash;
		return {name, hash: mh};
	});

var probemapHashes = inflate(rawProbemapHashes);
var cohortHashes = inflate(rawCohortHashes);

function minHashFromList(list) {
	var mh = new Minhash();
	list.forEach(p => mh.update(p));
	return mh;
}

function recommend(list, hashes, thresh) {
	var mh = minHashFromList(list),
		scores = hashes.map(({name, hash}) => ({name, score: hash.jaccard(mh)}));
	return sortBy(scores, 'score').reverse().filter(x => x.score > thresh);
}

module.exports = {
	probemap: probes => recommend(probes, probemapHashes, 0.001),
	cohort: samples => recommend(samples, cohortHashes, 0.001)
};
