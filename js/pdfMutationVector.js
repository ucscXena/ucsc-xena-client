import { drawMutations, drawSV } from './drawMutations.js';
import * as _ from './underscore_ext.js';
import * as widgets from './columnWidgets.js';

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
