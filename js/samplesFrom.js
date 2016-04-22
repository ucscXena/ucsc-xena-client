/*global require: false module: false */
'use strict';
var xenaQuery = require('./xenaQuery');
var datasetSamples = xenaQuery.dsID_fn(xenaQuery.dataset_samples);

var multi = require('./multi');

var samplesFrom = multi(x => x.fetchType);

samplesFrom.add('xena', ({dsID}) => datasetSamples(dsID).map(s => [s]));

module.exports = samplesFrom;
