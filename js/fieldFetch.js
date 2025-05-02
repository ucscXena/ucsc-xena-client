
import multi from './multi.js';
import * as denseMatrix from './models/denseMatrix.js';
import * as mutationVector from './models/mutationVector.js';
import * as segmented from './models/segmented.js';
import Rx from './rx';

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

export default fetch;
