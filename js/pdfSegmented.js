import { drawSegmented } from './drawSegmented.js';
import * as _ from './underscore_ext.js';
import * as widgets from './columnWidgets.js';

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
