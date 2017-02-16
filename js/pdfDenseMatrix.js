'use strict';
var drawHeatmap = require('./drawHeatmap');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');

function pdf(column, vg, state, i) {
	let {zoom} = state,
		colID = _.getIn(state, ['columnOrder', i]),
		data = _.getIn(state, ['data', colID]),
		codes = _.getIn(data, ['codes']),
		{heatmap, colors} = column;

	drawHeatmap(vg, {
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
