'use strict';
var {drawHeatmap} = require('./drawHeatmap');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');

function pdf(id, column, vg, state) {
	let {samples, zoom} = state,
		{heatmap, colors, codes} = column;

	drawHeatmap(vg, {
		samples,
		codes,
		width: _.getIn(column, ['width']),
		zoom,
		colors,
		heatmapData: heatmap
	});
}

widgets.pdf.add('probes', pdf);
widgets.pdf.add('geneProbes', pdf);
widgets.pdf.add('genes', pdf);
widgets.pdf.add('clinical', pdf);
