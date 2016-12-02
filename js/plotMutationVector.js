/*eslint-env browser */
/*global require: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var React = require('react');
var Legend = require('./views/Legend');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var widgets = require('./columnWidgets');
var util = require('./util');
var CanvasDrawing = require('./CanvasDrawing');
var mv = require('./models/mutationVector');
var {drawSV, drawMutations, radius, toYPx, toYPxSubRow, minVariantHeight, splitRows} = require('./drawMutations');
var {chromPositionFromScreen} = require('./exonLayout');

// Since we don't set module.exports, but instead register ourselves
// with columWidgets, react-hot-loader can't handle the updates automatically.
// Accept hot loading here.
if (module.hot) {
	module.hot.accept();
	module.hot.accept('./models/mutationVector', () => {
		mv = require('./models/mutationVector');
	});
}

// Since there are multiple components in the file we have to use makeHot
// explicitly.
function hotOrNot(component) {
	return module.makeHot ? module.makeHot(component) : component;
}

function drawLegend({column}) {
	if (!column.legend) {
		return null;
	}
	var {colors, labels, align} = column.legend;

	return (
		<Legend
			colors={['rgb(255,255,255)', ...colors]}
			labels={['no variant', ...labels]}
			align={align}
			ellipsis='' />
	);
}

function closestNodeSNV(nodes, zoom, x, y) {
	var cutoffX = radius,
		{index, height, count} = zoom,
		cutoffY = minVariantHeight(height / count) / 2,
		end = index + count,
		nearBy = _.filter(nodes, n => n.y >= index && n.y < end &&
			Math.abs(y - toYPx(zoom, n).y) < cutoffY &&
			(x > n.xStart - cutoffX) && (x < n.xEnd + cutoffX));

	return nearBy.length > 0 ?
		_.min(nearBy, n =>
				Math.pow((y - toYPx(zoom, n).y), 2) + Math.pow((x - (n.xStart + n.xEnd) / 2.0), 2)) :
		undefined;
}

function closestNodeSV(nodes, zoom, x, y) {
	var {index, height, count} = zoom,
		end = index + count,
		toY = splitRows(count, height) ? toYPxSubRow : toYPx,
		underRow = v => {
			var {svHeight, y: suby} = toY(zoom, v);
			return Math.abs(y - suby) < svHeight / 2;
		},
		underMouse = _.filter(nodes, n => n.y >= index && n.y < end &&
							 x >= n.xStart && x <= n.xEnd && underRow(n));
	return underMouse[0];
}

var closestNode = {
	SV: closestNodeSV,
	mutation: closestNodeSNV
};

function formatAf(af) {
	return (af === 'NA' || af === '' || af == null) ? null :
		Math.round(af * 100) + '%';
}

var fmtIf = (x, fmt, d = '' ) => x ? fmt(x) : d;
var dropNulls = rows => rows.map(row => row.filter(col => col != null)) // drop empty cols
	.filter(row => row.length > 0); // drop empty rows
var posDoubleString = p => `${p.chr}:${util.addCommas(p.start)}-${util.addCommas(p.end)}`;
var posStartString = p => `${p.chr}:${util.addCommas(p.start)}`;
var gbURL = (assembly, pos) => {
	// assembly : e.g. hg18
	// pos: e.g. chr3:178,936,070-178,936,070
	var assemblyString = encodeURIComponent(assembly),
		positionString = encodeURIComponent(pos);
	return `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${assemblyString}&highlight=${assemblyString}.${positionString}&position=${positionString}`;
};

function sampleTooltip(sampleFormat, data, gene, assembly) {
	var dnaVaf = data.dna_vaf == null ? null : ['labelValue',  'DNA variant allele freq', formatAf(data.dna_vaf)],
		rnaVaf = data.rna_vaf == null ? null : ['labelValue',  'RNA variant allele freq', formatAf(data.rna_vaf)],
		ref = data.reference && ['value', `${data.reference} to `],
		altPos = data.alt && mv.structuralVariantClass(data.alt) &&
			`chr${mv.chromFromAlt(data.alt)}:${mv.posFromAlt(data.alt)}-${mv.posFromAlt(data.alt)}`,
		alt = data.alt && (mv.structuralVariantClass(data.alt) ?
							['url', `${data.alt}`, gbURL(assembly, altPos)] :
							['value', `${data.alt}`]),
		posDisplay = data && (data.start === data.end) ? posStartString(data) : posDoubleString (data),
		posURL = ['url',  `${assembly} ${posDisplay}`, gbURL(assembly, posDoubleString (data))],
		effect = ['value', fmtIf(data.effect, x => `${x}, `) + //eslint-disable-line comma-spacing
					gene +
					fmtIf(data.amino_acid, x => ` (${x})`) +
					fmtIf(data.altGene, x => ` connect to ${x} `)
					];
	return {
		rows: dropNulls([
			[effect],
			[posURL, ref, alt],
			[dnaVaf],
			[rnaVaf]
		]),
		sampleID: sampleFormat(data.sample)
	};
}

function posTooltip(layout, samples, sampleFormat, pixPerRow, index, assembly, x, y) {
	var yIndex = Math.round((y - pixPerRow / 2) / pixPerRow + index),
		pos = Math.floor(chromPositionFromScreen(layout, x)),
		coordinate = {
			chr: layout.chromName,
			start: pos,
			end: pos
		};
	return {
		sampleID: sampleFormat(samples[yIndex]),
		rows: [[['url',
			`${assembly} ${posStartString(coordinate)}`,
			gbURL(assembly, posDoubleString(coordinate))]]]};
}

function tooltip(fieldType, layout, nodes, samples, sampleFormat, zoom, gene, assembly, ev) {
	var {x, y} = util.eventOffset(ev),
		{height, count, index} = zoom,
		pixPerRow = height / count,
		// XXX workaround for old bookmarks w/o chromName
		lo = _.updateIn(layout, ['chromName'],
				c => c || _.getIn(nodes, [0, 'data', 'chr'])),
		node = closestNode[fieldType](nodes, zoom, x, y);

	return node ?
		sampleTooltip(sampleFormat, node.data, gene, assembly) :
		posTooltip(lo, samples, sampleFormat, pixPerRow, index, assembly, x, y);
}

var MutationColumn = hotOrNot(React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		this.events('mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = this.ev.mouseover
			.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.selectMany(() => {
				return this.ev.mousemove
					.takeUntil(this.ev.mouseout)
					.map(ev => ({
						data: this.tooltip(ev),
						open: true
					})) // look up current data
					.concat(Rx.Observable.return({open: false}));
			}).subscribe(this.props.tooltip);
	},
	componentWillUnmount: function () {
		this.ttevents.dispose();
	},
	tooltip: function (ev) {
		var {column: {fieldType, layout, nodes, fields, assembly}, samples, sampleFormat, zoom} = this.props;
		return tooltip(fieldType, layout, nodes, samples, sampleFormat, zoom, fields[0], assembly, ev);
	},
	render: function () {
		var {column, samples, zoom, index, draw} = this.props;

		return (
			<CanvasDrawing
					ref='plot'
					draw={draw}
					wrapperProps={{
						className: 'Tooltip-target',
						onMouseMove: this.ev.mousemove,
						onMouseOut: this.ev.mouseout,
						onMouseOver: this.ev.mouseover,
						onClick: this.props.onClick
					}}
					nodes={column.nodes}
					strand={column.strand}
					width={column.width}
					index={index}
					samples={samples}
					xzoom={column.zoom}
					zoom={zoom}/>);
	}
}));

widgets.column.add('mutation',
		props => <MutationColumn draw={drawMutations} {...props} />);
widgets.column.add('SV',
		props => <MutationColumn draw={drawSV} {...props} />);

widgets.legend.add('mutation', drawLegend);
widgets.legend.add('SV', drawLegend);
