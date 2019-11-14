var {drawSamples} = require('./drawSamples');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');

function pdf(id, column, vg, state, i) {
	let {zoom} = state,
		colID = _.getIn(state, ['columnOrder', i]),
		data = _.getIn(state, ['data', colID]),
		codes = _.getIn(data, ['codes']),
		{heatmap} = column;

	drawSamples(vg, {
		codes,
		width: _.getIn(column, ['width']),
		zoom,
		heatmapData: heatmap
	});
}

widgets.pdf.add('samples', pdf);
