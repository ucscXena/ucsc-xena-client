'use strict';
var {drawMutations, drawSV} = require('./drawMutations');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');

var pdf = _.curry((draw, id, column, vg, state, i) => {
	let {zoom} = state,
		colID = _.getIn(state, ['columnOrder', i]),
		data = _.getIn(state, ['data', colID]),
		index = _.getIn(state, ['index', colID]);

	draw(vg, {
		feature: column.sFeature,
		index,
		column,
		samples: state.samples,
		nodes: column.nodes,
		data,
		width: column.width,
		zoom,
	});
});

widgets.pdf.add('mutation', pdf(drawMutations));
widgets.pdf.add('SV', pdf(drawSV));
