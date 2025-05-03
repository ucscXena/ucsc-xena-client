/*global require: false, run: false */
// This needs refactor. Might want to return mutationVector methods in exports,
// and call widget.*.add elsewhere, so we can test the methods w/o widgets.
//require('./mutationVector');
require('./exonLayout');
require('./refGeneExons');
require('./plotDenseMatrix');
require('./plotMutationVector');
require('./heatmapColors');
require('./scale');
require('./underscore_ext');
// this is unreliable in CI
//require('./fieldFetch');
//require('./compactData');
require('./parsePos');
require('./permuteCase');
require('./lcs');
require('./stripeHeight');
require('./findIntrons');
require('./layoutPlot');
//require('./matrix-test');
require('./Legend');
require('./drawHeatmap');
require('./binpackJSON');
require('./singleCell');
require('./fvc');
// not currently doing any xeanWasm tests.
//import * as xenaWasm from '../js/xenaWasm';
//xenaWasm.loaded.then(() => run());
require('./query.js');
