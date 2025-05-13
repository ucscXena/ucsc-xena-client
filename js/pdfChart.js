import * as _ from './underscore_ext.js';

var download = () => {
	Promise.all([import('./pdfkit'), import('svg-to-pdfkit'), import('blob-stream')
	]).then(([pdfkitModule, SVGtoPDFModule, blobStreamModule]) => {
		const PDFDocument = pdfkitModule.default;
		const blobStream = blobStreamModule.default;
		const SVGtoPDF = SVGtoPDFModule.default;

		var svg = document.getElementsByClassName('highcharts-root')[0],
			r = svg.getBoundingClientRect(),
			doc = new PDFDocument({compress: false, size: [r.width, r.height]}),
			buttons = document.getElementsByClassName('highcharts-button'),
			scrollBars = document.getElementsByClassName('highcharts-scrollbar'),
			btnDisplay = _.map(buttons, b => b.style.display),
			sBDisplay = _.map(scrollBars, b => b.style.display),
			stream = doc.pipe(blobStream());

		_.forEach(buttons, b => b.style.display = 'none');
		_.forEach(scrollBars, b => b.style.display = 'none');
		SVGtoPDF(doc, svg, 0, 0, {preserveAspectRatio: 'xMidYMid'});
		_.forEach(buttons, (b, i) => b.style.display = btnDisplay[i]);
		_.forEach(scrollBars, (b, i) => b.style.display = sBDisplay[i]);
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
