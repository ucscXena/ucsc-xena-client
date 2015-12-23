/*global require: false */
"use strict";
require('./underscore_ext');
// This needs refactor. Might want to return mutationVector methods in exports,
// and call widget.*.add elsewhere, so we can test the methods w/o widgets.
//require('./mutationVector');
require('./exonLayout');
require('./refGeneExons');
require('./plotDenseMatrix');
require('./plotMutationVector');
require('./lenses/lens');
require('./heatmapColors');
require('./scale');
