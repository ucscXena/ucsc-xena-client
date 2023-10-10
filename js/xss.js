import xss from 'xss';

var whiteList = {
	a: ['target', 'href', 'title', 'style'],
	button: ['class', 'data-cohort', 'data-bookmark'],
	abbr: ['title', 'style'],
	address: ['style'],
	area: ['shape', 'coords', 'href', 'alt', 'style'],
	article: ['style'],
	aside: ['style'],
	audio: ['autoplay', 'controls', 'loop', 'preload', 'src', 'style'],
	b: ['style'],
	bdi: ['dir', 'style'],
	bdo: ['dir', 'style'],
	big: ['style'],
	blockquote: ['cite', 'style'],
	br: ['style'],
	caption: ['style'],
	center: ['style'],
	cite: ['style'],
	code: ['style'],
	col: ['align', 'valign', 'span', 'width', 'style'],
	colgroup: ['align', 'valign', 'span', 'width', 'style'],
	dd: ['style'],
	del: ['datetime', 'style'],
	details: ['open', 'style'],
	div: ['style'],
	dl: ['style'],
	dt: ['style'],
	em: ['style'],
	figure: ['style'],
	figcaption: ['style'],
	font: ['color', 'size', 'face', 'style'],
	footer: ['style'],
	h1: ['style'],
	h2: ['style'],
	h3: ['style'],
	h4: ['style'],
	h5: ['style'],
	h6: ['style'],
	header: ['style'],
	hr: ['style'],
	i: ['style'],
	iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen'],
	img: ['src', 'alt', 'title', 'width', 'height', 'style'],
	ins: ['datetime', 'style'],
	li: ['style'],
	mark: ['style'],
	nav: ['style'],
	ol: ['style'],
	p: ['style'],
	pre: ['style'],
	s: ['style'],
	section: ['style'],
	small: ['style'],
	span: ['style'],
	sub: ['style'],
	sup: ['style'],
	strong: ['style'],
	table: ['width', 'border', 'align', 'valign', 'style'],
	tbody: ['align', 'valign', 'style'],
	td: ['width', 'rowspan', 'colspan', 'align', 'valign', 'style'],
	tfoot: ['align', 'valign', 'style'],
	th: ['width', 'rowspan', 'colspan', 'align', 'valign', 'style'],
	thead: ['align', 'valign', 'style'],
	tr: ['rowspan', 'align', 'valign', 'style'],
	tt: ['style'],
	u: ['style'],
	ul: ['style'],
	video: ['autoplay', 'controls', 'loop', 'preload', 'src', 'height', 'width', 'style']
};

var filter = new xss.FilterXSS({whiteList});

export default html => filter.process(html);
