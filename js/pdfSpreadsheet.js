'use strict';
var PDFDocument = require('pdfkit');
var blobStream = require('blob-stream');
var vgpdf = require('./vgpdf');
var styles = require('./spreadsheetStyles');
var widgets = require('./columnWidgets');

require('./pdfMutationVector');
require('./pdfDenseMatrix');
require('./pdfSegmented');
var _ = require('./underscore_ext');

var totalWidth = cols =>
	(cols.length - 1) * styles.column.margin +
		_.reduce(_.pluck(cols, 'width'), (x, y) => x + y, 0);


function getOffsets(cols) {
	var widths = _.pluck(cols, 'width'),
		m = styles.column.margin;
	return _.scan(widths, (acc, n) => acc + n + m, 0);
}

var download = state => {
	let columns = state.columnOrder.map(id => state.columns[id]),
		width = totalWidth(columns),
		// pdfkit zlib is pathologically slow.
		doc = new PDFDocument({compress: false, size: [width, state.zoom.height]}),
		stream = doc.pipe(blobStream()),
		vg = vgpdf(doc),
		offsets = getOffsets(columns);

	columns.forEach((column, i) =>
		vg.translate(offsets[i], 0, () => {
			widgets.pdf(column, vg, state, i);
		}));
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
};

module.exports = download;
