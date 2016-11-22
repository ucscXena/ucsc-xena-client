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
var {drawSegmented, toYPx} = require('./drawSegmented');
var {chromPositionFromScreen} = require('./exonLayout');
var colorScales = require('./colorScales');

// Since we don't set module.exports, but instead register ourselves
// with columWidgets, react-hot-loader can't handle the updates automatically.
// Accept hot loading here.
if (module.hot) {
	module.hot.accept();
}

// Since there are multiple components in the file we have to use makeHot
// explicitly.
function hotOrNot(component) {
	return module.makeHot ? module.makeHot(component) : component;
}

// Color scale cases
// Use the domain of the scale as the label.
// If using thresholded scales, add '<' '>' to labels.

var cases = ([tag], arg, c) => c[tag](arg);

function legendForColorscale(colorSpec) {
	var scale = colorScales.colorScale(colorSpec),
		values = scale.domain(),
		colors = _.map(values, scale);

	var labels = cases(colorSpec, values, {
		'no-data': () => [],
		'float': _.identity,
		'float-pos': _.identity,
		'float-neg': _.identity,
		'float-thresh': ([nl, nh, pl, ph]) => [nl, nh, pl, ph],
		'float-thresh-pos': ([low, high]) => [low, high],
		'float-thresh-neg': ([low, high]) => [low, high]
	});

	return {colors, labels};
}

// We never want to draw multiple legends. We only draw the 1st scale
// passed in. The caller should provide labels/colors in the 'legend' prop
// if there are multiple scales.
function renderFloatLegend(props) {
	var {units, colors, vizSettings, defaultNormalization, data} = props,
		hasData = _.getIn(colors, [0]);

	var {labels, colors: legendColors} = hasData ? legendForColorscale(colors[0]) :
		{colors: [], labels: []},
		footnotes = (units || []).slice(0), // copy to avoid modification, below
		nSamples = (data && data.length) ? data[0].filter(v => v != null).length : 0,
		normalizationText = "mean is subtracted per column across " + nSamples + " samples",
		hasViz = vizSettings => !isNaN(_.getIn(vizSettings, ['min'])),
		multiScaled = colors && colors.length > 1 && !hasViz(vizSettings);

	if (multiScaled) {
		labels = labels.map((label, i) => {
			if (i === 0) {return "lower";}
			else if(i === labels.length - 1) {return "higher";}
			else {return "";}
		});
	}

	if (vizSettings &&  vizSettings.colNormalization) {
		if (vizSettings.colNormalization === "subset") { // substract mean per subcolumn
			footnotes.push(normalizationText);
		}
	} else if (defaultNormalization) {
		footnotes.push(normalizationText);
	}

	return <Legend colors={legendColors} labels={labels} footnotes={footnotes}/>;
}

function drawLegend(props) {
	var {column, data} = props,
		{units, heatmap, color, legend, valueType, vizSettings, defaultNormalization} = column,
		legendProps = {
			units,
			colors: [color],
			legend,
			vizSettings,
			defaultNormalization,
			data: heatmap,
			coded: valueType === 'coded',
			codes: _.get(data, 'codes'),
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

var fmtIf = (x, fmt, d = '' ) => x ? fmt(x) : d;
var dropNulls = rows => rows.map(row => row.filter(col => col != null)) // drop empty cols
	.filter(row => row.length > 0); // drop empty rows
var gbURL =  (assembly, pos) => `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${encodeURIComponent(assembly)}&position=${encodeURIComponent(pos)}`;

function sampleTooltip(sampleFormat, data, gene, assembly) {
	var pos = data && `${data.chr}:${util.addCommas(data.start)}-${util.addCommas(data.end)}`,
		posDisplay = data && (data.start === data.end) ? `${data.chr}:${util.addCommas(data.start)}` : pos,
		posURL = ['url',  `${assembly} ${posDisplay}`, gbURL(assembly, pos)],
		value = ['value', fmtIf(data.value, x => `${x}, `) + gene];
	return {
		rows: dropNulls([
			[value],
			[posURL]
		]),
		sampleID: sampleFormat(data.sample)
	};
}

function makeRow(fields, sampleGroup, row) {
	console.log("FIXME");
	let fieldValue;
	if (_.isArray(sampleGroup) && sampleGroup.length === 0) {
		fieldValue = 'no variant';
	}
	if (_.isEmpty(sampleGroup)) {
		sampleGroup = [row];
	}
	return _.flatmap(sampleGroup, row =>
		_.map(fields, f => (row && row[f]) || fieldValue));
}

function posTooltip(layout, samples, sampleFormat, pixPerRow, index, assembly, x, y) {
	var yIndex = Math.round((y - pixPerRow / 2) / pixPerRow + index),
		pos = Math.floor(chromPositionFromScreen(layout, x));
	return {
		sampleID: sampleFormat(samples[yIndex]),
		rows: [[['url',
			`${assembly} ${layout.chromName}:${util.addCommas(pos)}`,
			gbURL(assembly, pos)]]]};
}

function tooltip(fieldType, layout, nodes, samples, sampleFormat, zoom, gene, assembly, ev) {
	var {x, y} = util.eventOffset(ev),
		{height, count, index} = zoom,
		pixPerRow = height / count,
		// XXX workaround for old bookmarks w/o chromName
		lo = _.updateIn(layout, ['chromName'],
				c => c || _.getIn(nodes, [0, 'data', 'chr'])),
		node = closestNode(nodes, zoom, x, y);

	return node ?
		sampleTooltip(sampleFormat, node.data, gene, assembly) :
		posTooltip(lo, samples, sampleFormat, pixPerRow, index, assembly, x, y);
}

function getRowFields(rows, sampleGroups) {
	if (_.isEmpty(sampleGroups)) {
		return []; // When no samples exist
	} else if (!_.isEmpty(rows)) {
		return _.keys(rows[0]); // When samples have mutation(s)
	} else {
		return ['sample', 'result']; // default fields for mutation-less columns
	}
}

function formatSamples(sampleFormat, rows) {
	return _.map(rows, r => _.updateIn(r, ['sample'], sampleFormat));
}

var SegmentedColumn = hotOrNot(React.createClass({
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
	download: function() {
		let {data: {req: {rows}}, samples, index, sampleFormat} = this.props,
			groupedSamples = _.getIn(index, ['bySample']) || [],
			rowFields = getRowFields(rows, groupedSamples),
			allRows = _.map(samples, (sId) => {
				let alternateRow = {sample: sampleFormat(sId)}; // only used for mutation-less samples
				return makeRow(rowFields, formatSamples(sampleFormat, groupedSamples[sId]),
					alternateRow);
			});
		return [rowFields, allRows];
	},
	tooltip: function (ev) {
		var {column: {fieldType, layout, nodes, fields, assembly}, samples, sampleFormat, zoom} = this.props;
		return tooltip(fieldType, layout, nodes, samples, sampleFormat, zoom, fields[0], assembly, ev);
	},
	render: function () {
		var {column, samples, zoom, index} = this.props;

		return (
			<CanvasDrawing
					ref='plot'
					draw={drawSegmented}
					wrapperProps={{
						className: 'Tooltip-target',
						onMouseMove: this.ev.mousemove,
						onMouseOut: this.ev.mouseout,
						onMouseOver: this.ev.mouseover,
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
}));

widgets.column.add('segmented',
		props => <SegmentedColumn {...props} />);

widgets.legend.add('segmented', drawLegend);
