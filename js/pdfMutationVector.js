/*eslint-env browser */
/*global require: false, module: false */
'use strict';
var {drawMutations} = require('./drawMutations');
var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');

function pdf(column, vg, state, i) {
	let {zoom} = state,
		colID = _.getIn(state, ['columnOrder', i]),
		data = _.getIn(state, ['data', colID]),
		index = _.getIn(state, ['index', colID]);

	drawMutations(vg, {
		feature: column.sFeature,
		index,
		column,
		samples: state.samples,
		nodes: column.nodes,
		data,
		width: column.width,
		zoom,
	});
}

widgets.pdf.add('mutationVector', pdf);
