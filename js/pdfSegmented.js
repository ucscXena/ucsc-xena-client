var {drawSegmented} = require('./drawSegmented.js');
var _ = require('./underscore_ext').default;
var widgets = require('./columnWidgets');

var pdf = (id, column, vg, state, i) => {
	let {zoom, samples} = state,
		{zoom: xzoom, color, nodes, strand, width} = column,
		colID = _.getIn(state, ['columnOrder', i]),
		data = _.getIn(state, ['data', colID]),
		index = _.getIn(state, ['index', colID]);

	drawSegmented(vg, {
		index,
		column,
		samples,
		nodes,
		strand,
		data,
		width,
		zoom,
		xzoom,
		color
	});
};

widgets.pdf.add('segmented', pdf);
