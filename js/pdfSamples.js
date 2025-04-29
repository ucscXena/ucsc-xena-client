import { drawSamples } from './drawSamples.js';
import * as _ from './underscore_ext.js';
import * as widgets from './columnWidgets.js';

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
