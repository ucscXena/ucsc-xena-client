var styles = require('./spreadsheetStyles');
var widgets = require('./columnWidgets');

require('./pdfMutationVector');
require('./pdfDenseMatrix');
require('./pdfSegmented');
require('./pdfSamples');
var _ = require('./underscore_ext').default;
import {drawRefGeneExons} from './refGeneExons';
import {showPosition, annotationHeight, positionHeight} from './views/Column';
import vgcanvas from './vgcanvas';

var totalWidth = cols =>
	(cols.length - 1) * styles.column.margin +
		_.reduce(_.pluck(cols, 'width'), (x, y) => x + y, 0);


function getOffsets(cols) {
	var widths = _.pluck(cols, 'width'),
		m = styles.column.margin;
	return _.scan(widths, (acc, n) => acc + n + m, 0);
}

var pdfImgHeight = 2000;

var download = state => {
	require.ensure(['pdfkit', 'blob-stream', './vgpdf'], () => {
		var PDFDocument = require('pdfkit');
		var blobStream = require('blob-stream');
		var vgpdf = require('./vgpdf');
		let columns = state.columnOrder.map(id => state.columns[id]),
			data = state.data,
			width = totalWidth(columns),
			// pdfkit zlib is pathologically slow.
			doc = new PDFDocument({compress: false,
				size: [width, state.zoom.height + annotationHeight]}),
			stream = doc.pipe(blobStream()),
			vg = vgpdf(doc, pdfImgHeight * width / state.zoom.height, pdfImgHeight),
			offsets = getOffsets(columns);

		columns.forEach((column, i) => {
			if (showPosition(column)) {
				vg.translate(offsets[i], 0, () => {
					vg.clip(0, 0, column.width, annotationHeight, () =>
						vg.mirror(vgcanvas(document.createElement('canvas'),
								column.width, annotationHeight), vgw => {
							drawRefGeneExons(vgw, {
								id: state.columnOrder[i],
								column,
								position: _.getIn(column, ['layout', 'chrom', 0]),
								refGene: _.getIn(data, [state.columnOrder[i], 'refGene'], {}),
								// XXX move all this column lookup into drawRefGeneExons
								probePosition: column.position,
								layout: column.layout,
								height: annotationHeight,
								positionHeight: column.position ? positionHeight : 0,
								width: column.width});
					}));
				});
			}
			vg.translate(offsets[i], annotationHeight, () => {
				widgets.pdf(state.columnOrder[i], column, vg, state, i);
			});
		});
		doc.end();

		stream.on('finish', () => {
			var url = stream.toBlobURL('application/pdf');

			var a = document.createElement('a');
			var filename = 'xenaDownload.pdf';
			Object.assign(a, { id: filename, download: filename, href: url });
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
		});
	});
};

export default download;
