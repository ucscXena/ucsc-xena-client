// It is unfortunate that this duplicates the code in KmPlot and Axis.js, however it's
// hard to repurpose the react views to drive a different renderer. The React data
// structures are opaque to the caller. We could reverse-engineer them, but then would
// be subject to breakage when React updates. We could write a custom declarative
// representation that maps to react or pdf, but this quickly becomes complex. This
// port of KmPlot to pdf is a compromise.
// Another strategy worth exploring is walking the DOM to generate pdf calls. That
// might also work for highcharts.
var _ = require('./underscore_ext').default;
var {linear, linearTicks} = require('./scale');

var margin = {top: 20, right: 30, bottom: 30, left: 50};
var bounds = x => [_.min(x), _.max(x)];

// XXX duplicated in km.css
var style = {
	outline: {
		width: 2
	},
	line: {
		width: 1
	},
	axisLabel: {
		height: 12
	}
};

// XXX duplicated in Axis.js.
var tickPadding = 3;
function horzLayout(domain, range, scale, tickfn, tickHeight) {
	return tickfn.apply(null, domain).map(x => ([
		[scale(x), 0], [0, tickHeight],
		[0, tickHeight + tickPadding], x.toLocaleString(),
		'middle', -0.3 * style.axisLabel.height
	]));
}

function vertLayout(domain, range, scale, tickfn, tickHeight) {
	return tickfn.apply(null, domain).map(y => ([
		[0, scale(y)], [-tickHeight, 0],
		[-(tickHeight + tickPadding), 0], y.toLocaleString(),
		'end', 0.32 * style.axisLabel.height
	]));
}

var layout = {
	bottom: horzLayout,
	left: vertLayout
};

var textAnchored = {
	middle: (vg, x, y, c, h, txt) => {
		var width = vg.textWidth(h, txt);
		vg.text(x - width / 2, y + h, c, h, txt);
	},
	end: (vg, x, y, c, h, txt) => {
		var width = vg.textWidth(h, txt);
		vg.text(x - width, y, c, h, txt);
	}
};

var domainPath = {
	bottom: (vg, [start, end], height) => vg.drawPoly([[start, height, start, 0], [end, 0], [end, height]],
													  {strokeStyle: 'black', lineWidth: 1}),
	left: (vg, [start, end], height) => vg.drawPoly([[-height, start, 0, start], [0, end], [-height, end]],
													{strokeStyle: 'black', lineWidth: 1})
};

function axis(vg, {domain, range, scale, tickfn, orientation, tickHeight = 6}) {
	var ticks = layout[orientation](domain, range, scale, tickfn, tickHeight);

	domainPath[orientation](vg, range, tickHeight);
	ticks.forEach(([[x, y], [dx, dy], [lx, ly], label, anchor, off]) => { //eslint-disable-line no-unused-vars
		vg.translate(x, y, () => {
			vg.drawPoly([[0, 0, dx, dy]], {strokeStyle: 'black', lineWidth: 1});
			textAnchored[anchor](vg, lx, ly + off, 'black', style.axisLabel.height, label);
		});
	});
}

function censorLines(vg, xScale, yScale, censors, style, color) {
	censors.forEach(({t, s}) => {
		vg.translate(xScale(t), yScale(s), () => {
			vg.drawPoly([[0, -5, 0, 5]],
				{strokeStyle: color,
				lineWidth: style.width});
		});
	});
}

// Expand coords as step function
function stepPath(coords) {
	var acc = [], y0 = 0;
	coords.forEach(([x, y]) => {
		acc.push([x, y0]);
		acc.push([x, y]);
		y0 = y;
	});
	return acc;
}

function line(vg, xScale, yScale, values, style, color) {
	var coords = _.map(values, ({t, s}) => [xScale(t), yScale(s)]),
		path = stepPath(coords);

	vg.drawPoly([[0, 0, 0, 0], ...path],
		{strokeStyle: color,
		lineWidth: style.width});
}

function lineGroup(vg, {g, xScale, yScale}) {
	var [color, , curve] = g,
		censors = curve.filter(pt => !pt.e);

	line(vg, xScale, yScale, curve, style.outline, 'black');
	line(vg, xScale, yScale, curve, style.line, color);
	censorLines(vg, xScale, yScale, censors, style.outline, 'black');
	censorLines(vg, xScale, yScale, censors, style.line, color);
}

// Fix height to be square, as this is the convention.
var size = {height: 500, width: 500};

function download({colors, labels, curves}) {
	require.ensure(['pdfkit', 'blob-stream', './vgpdf'], () => {
		var PDFDocument = require('pdfkit');
		var blobStream = require('blob-stream');
		var vgpdf = require('./vgpdf');
		var height = size.height - margin.top - margin.bottom,
			width = size.width - margin.left - margin.right,
			xdomain = bounds(_.pluck(_.flatten(curves), 't')),
			xrange = [0, width],
			ydomain = [0, 1],
			yrange = [height, 0],
			xScale = linear(xdomain, xrange),
			yScale = linear(ydomain, yrange),

			doc = new PDFDocument({compress: false, size: [size.width, size.height]}),
			stream = doc.pipe(blobStream()),
			vg = vgpdf(doc);

		vg.translate(margin.left, margin.top, () => {
			axis(vg, {domain: ydomain, range: yrange, scale: yScale, tickfn: linearTicks, orientation: 'left'});
			vg.translate(0, height, () => {
				axis(vg, {domain: xdomain, range: xrange, scale: xScale, tickfn: linearTicks, orientation: 'bottom'});
			});
			_.each(_.zip(colors, labels, curves), g => {
				lineGroup(vg, {g, xScale, yScale});
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

module.exports = download;
