/*global require: false */
"use strict";
require('babel-polyfill');
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
require('./fieldFetch');
require('./fieldSpec');
require('./fields');
require('./datasetJoins');
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
