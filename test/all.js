/*global before: false */

// Clear storage to eliminate stale data
localStorage.clear();
sessionStorage.clear();

import * as xenaWasm from '../js/xenaWasm';
before(() => xenaWasm.loaded);

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
// need delay for wasm loading, which is used in draw and scale
// tests.
require('./query.js');
