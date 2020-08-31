
var _ = require('./underscore_ext').default;
var Rx = require('./rx').default;
import PureComponent from './PureComponent';
var React = require('react');
var BandLegend = require('./views/BandLegend');
var {rxEvents} = require('./react-utils');
var widgets = require('./columnWidgets');
var util = require('./util').default;
var CanvasDrawing = require('./CanvasDrawing');
var {drawSegmented, toYPx} = require('./drawSegmented');
var {chromPositionFromScreen} = require('./exonLayout');
import {colorScale} from './colorScales';

// Since there are multiple components in the file we have to use hot
// explicitly.
import {hot} from 'react-hot-loader';
function hotOrNot(component) {
	return module.hot ? hot(module)(component) : component;
}

// might want to use <wbr> here, instead, so cut & paste work better, but that
// will require a recursive split/flatmap to inject the <wbr> elements.
var addWordBreaks = str => str.replace(/([_/])/g, '\u200B$1\u200B');

function renderFloatLegend(props) {
	var {units, color} = props;

	if (color[0] === 'no-data') {
		return null;
	}
	var unitText = (units || [''])[0] || '',
		footnotes = [<span title={unitText}>{addWordBreaks(unitText)}</span>];

	var [origin, , max] = color.slice(4),
		powerScale = colorScale(color).lookup,
		scale = v => v < origin ?
			powerScale(0, origin - v) :
			powerScale(1, v - origin),
		min = origin - (max - origin);

	return (
		<BandLegend
			range={{min, max}}
			colorScale={scale}
			footnotes={footnotes}
			width={50}
			height={20}/>);
}

function drawLegend(props) {
	var {column} = props,
		{units, color, vizSettings, defaultNormalization} = column,
		legendProps = {
			units,
			color,
			vizSettings,
			defaultNormalization
		};
	return renderFloatLegend(legendProps);
}

function closestNode(nodes, zoom, x, y) {
	var {index, count} = zoom,
		end = index + count,
		underRow = v => {
			var {svHeight, y: suby} = toYPx(zoom, v);
			return Math.abs(y - suby) < svHeight / 2;
		},
		underMouse = _.filter(nodes, n => n.y >= index && n.y < end &&
							 x >= n.xStart && x <= n.xEnd && underRow(n));
	return underMouse[0];
}

//var fmtIf = (x, fmt, d = '' ) => x ? fmt(x) : d;
var dropNulls = rows => rows.map(row => row.filter(col => col != null)) // drop empty cols
	.filter(row => row.length > 0); // drop empty rows
//gb position string for 1.5 x segment, centered at segment
var posRegionString = (chrom, p) => `${chrom}:${util.addCommas(p.start - Math.round((p.end - p.start) / 4))}-${util.addCommas(p.end + Math.round((p.end - p.start) / 4))}`;
//gb position string like chr3:178,936,070-178,936,070
var posDoubleString = (chrom, p) => `${chrom}:${util.addCommas(p.start)}-${util.addCommas(p.end)}`;
//gb position string like chr3:178,936,070
var posStartString = (chrom, p) => `${chrom}:${util.addCommas(p.start)}`;
// gb url link with highlight
var gbURL = (assembly, pos, highlightPos) => {
	// assembly : e.g. hg18
	// pos: e.g. chr3:178,936,070-178,936,070
	// highlight: e.g. chr3:178,936,070-178,936,070
	var assemblyString = encodeURIComponent(assembly),
		positionString = encodeURIComponent(pos),
		highlightString = encodeURIComponent(highlightPos);
	return `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${assemblyString}&highlight=${assemblyString}.${highlightString}&position=${positionString}`;
};

function sampleTooltip(chrom, sampleFormat, data, gene, assembly) {
	var posDisplay = data && (data.start === data.end) ? posStartString(chrom, data) : posDoubleString(chrom, data),
		posURL = ['url',  `${assembly} ${posDisplay}`, gbURL(assembly, posRegionString(chrom, data), posDoubleString(chrom, data))],
		value = ['labelValue', 'value', `${data.value}`];

	return {
		rows: dropNulls([
			[value],
			[posURL]
		]),
		sampleID: sampleFormat(data.sample)
	};
}

function posTooltip(layout, samples, sampleFormat, pixPerRow, index, assembly, x, y) {
	var chrom = layout.chromName,
		yIndex = Math.round((y - pixPerRow / 2) / pixPerRow + index),
		pos = Math.floor(chromPositionFromScreen(layout, x)),
		coordinate = {
			chr: chrom,
			start: pos,
			end: pos
		};
	return {
		sampleID: sampleFormat(samples[yIndex]),
		rows: [[['url',
			`${assembly} ${posStartString(chrom, coordinate)}`,
			gbURL(assembly, posRegionString(chrom, coordinate), posDoubleString(chrom, coordinate))]]]};
}

function tooltip(id, fieldType, layout, nodes, samples, sampleFormat, zoom, gene, assembly, ev) {
	var {x, y} = util.eventOffset(ev),
		{height, count, index} = zoom,
		pixPerRow = height / count,
		// XXX workaround for old bookmarks w/o chromName
		lo = _.updateIn(layout, ['chromName'],
				c => c || _.getIn(nodes, [0, 'data', 'chr'])),
		node = closestNode(nodes, zoom, x, y);

	return {
		x,
		id, ...(node ?
			sampleTooltip(lo.chromName, sampleFormat, node.data, gene, assembly) :
			posTooltip(lo, samples, sampleFormat, pixPerRow, index, assembly, x, y))};
}

var SegmentedColumn = hotOrNot(class extends PureComponent {
	componentWillMount() {
		var events = rxEvents(this, 'mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = events.mouseover
			.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.flatMap(() => {
				return events.mousemove
					.takeUntil(events.mouseout)
					.map(ev => ({
						data: this.tooltip(ev),
						open: true
					})) // look up current data
					.concat(Rx.Observable.of({open: false}));
			}).subscribe(this.props.tooltip);
	}

	componentWillUnmount() {
		this.ttevents.unsubscribe();
	}

	tooltip = (ev) => {
		var {column: {fieldType, layout, nodes, fields, assembly}, samples, sampleFormat, zoom, id} = this.props;
		return tooltip(id, fieldType, layout, nodes, samples, sampleFormat, zoom, fields[0], assembly, ev);
	};

	render() {
		var {column, samples, zoom, index} = this.props;

		return (
			<CanvasDrawing
					ref='plot'
					draw={drawSegmented}
					wrapperProps={{
						className: 'Tooltip-target',
						onMouseMove: this.on.mousemove,
						onMouseOut: this.on.mouseout,
						onMouseOver: this.on.mouseover,
						onClick: this.props.onClick
					}}
					color={column.color}
					nodes={column.nodes}
					strand={column.strand}
					width={column.width}
					index={index}
					samples={samples}
					xzoom={column.zoom}
					zoom={zoom}/>);
	}
});

widgets.column.add('segmented',
		props => <SegmentedColumn {...props} />);

widgets.legend.add('segmented', drawLegend);
