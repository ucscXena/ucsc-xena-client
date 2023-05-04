/*global require: false */
// This needs refactor. Might want to return mutationVector methods in exports,
// and call widget.*.add elsewhere, so we can test the methods w/o widgets.
//require('./mutationVector');
require('./exonLayout');
require('./refGeneExons');
require('./plotDenseMatrix');
require('./plotMutationVector');
require('./heatmapColors');
require('./scale');
require('./underscore_ext').default;
// this is unreliable in CI
//require('./fieldFetch');
require('./compactData');
require('./parsePos');
require('./permuteCase');
require('./lcs');
require('./stripeHeight');
require('./findIntrons');
require('./layoutPlot');
//require('./matrix-test');
require('./Legend');
require('./drawHeatmap');
require('./query.js');
