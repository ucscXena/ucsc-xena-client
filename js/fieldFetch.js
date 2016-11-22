/*global require: false module: false */
'use strict';

var multi = require('./multi');
var denseMatrix = require('./models/denseMatrix');
var mutationVector = require('./models/mutationVector');
var segmented = require('./models/segmented');
var _ = require('./underscore_ext');
var Rx = require('rx');

var totalSamples = samples => _.sum(_.pluck(samples, 'length'));

var fetch = multi((settings, samples) => totalSamples(samples) > 0 ? settings.fetchType : 'empty');

var xenaFetch = multi(x => `${x.fieldType}-${x.valueType}`); // make this fieldType?

xenaFetch.add("probes-float", denseMatrix.fetch);
xenaFetch.add("geneProbes-float", denseMatrix.fetchGeneProbes);
xenaFetch.add("genes-float", denseMatrix.fetchGene);
xenaFetch.add("clinical-float", denseMatrix.fetch);
xenaFetch.add("clinical-coded", denseMatrix.fetchFeature);
xenaFetch.add('segmented-segmented', segmented.fetch);
xenaFetch.add('mutation-mutation', mutationVector.fetch);
xenaFetch.add('SV-mutation', mutationVector.fetch);

fetch.add('xena', xenaFetch);
fetch.add('empty', () => Rx.Observable.return(null, Rx.Scheduler.timeout));

module.exports = fetch;
