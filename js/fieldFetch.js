'use strict';

var multi = require('./multi');
var denseMatrix = require('./models/denseMatrix');
var mutationVector = require('./models/mutationVector');
var segmented = require('./models/segmented');
var Rx = require('./rx');

var fetch = multi((settings, samples) => samples.length > 0 ? settings.fetchType : 'empty');

var xenaFetch = multi(x => `${x.fieldType}-${x.valueType}`); // make this fieldType?

xenaFetch.add("probes-float", denseMatrix.fetch);
xenaFetch.add("geneProbes-float", denseMatrix.fetchGeneOrChromProbes);
xenaFetch.add("genes-float", denseMatrix.fetchGene);
xenaFetch.add("clinical-float", denseMatrix.fetch);
xenaFetch.add("clinical-coded", denseMatrix.fetchFeature);
xenaFetch.add('segmented-segmented', segmented.fetch);
xenaFetch.add('mutation-mutation', mutationVector.fetch);
xenaFetch.add('SV-mutation', mutationVector.fetch);

fetch.add('xena', xenaFetch);
fetch.add('empty', () => Rx.Observable.of(null, Rx.Scheduler.asap));

module.exports = fetch;
