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
var {features, chromFromAlt, posFromAlt, structuralVariantClass} = require('./models/mutationVector');
var {drawMutations, radius, labelFont, toYPx} = require('./drawMutations');

// Since we don't set module.exports, but instead register ourselves
// with columWidgets, react-hot-loader can't handle the updates automatically.
// Accept hot loading here.
if (module.hot) {
	module.hot.accept();
	module.hot.accept('./models/mutationVector', () => {
		features = require('./models/mutationVector');
	});
}

// Since there are multiple components in the file we have to use makeHot
// explicitly.
function hotOrNot(component) {
	return module.makeHot ? module.makeHot(component) : component;
}

function drawLegend({column}) {
	var metaData = _.getIn(column, ['datasetMetadata'])[0],
		dataSubType = metaData.dataSubType,
		host = JSON.parse(metaData.dsID).host,
		feature = _.getIn(column, ['sFeature']),
		colors, labels, align,
		legendObj;

	if (metaData.color) {
		var customColorFile = host + "/download/" + metaData.color;
		Rx.DOM.ajax({'url': customColorFile, 'async': false, 'method': 'GET'}).subscribe(function(resp) {
			legendObj = features[feature].legend(dataSubType, JSON.parse(resp.responseText));
			colors = legendObj.colors;
			labels = legendObj.labels;
			align = legendObj.align;
		});
	} else {
		legendObj = features[feature].legend(dataSubType);
		colors = legendObj.colors;
		labels = legendObj.labels;
		align = legendObj.align;
	}

	return (
		<Legend
			colors={['rgb(255,255,255)', ...colors]}
			labels={['no variant', ...labels]}
			align={align}
			ellipsis='' />
	);
}

function closestNode(nodes, pixPerRow, index, count, x, y) {
	var cutoffX = radius,
		end = index + count,
		yPx = toYPx(pixPerRow, index),
		nearBy = _.filter(nodes, n => {
			if (!( n.y >= index && n.y < end &&
				(x > n.xStart - cutoffX) && (x < n.xEnd + cutoffX))) {
				return false;
			}
			var transformed = (pixPerRow > labelFont) && n.yTransformed,
				cutoffY = transformed ? n.svHeight / 2 :  pixPerRow / 2 ;
			return Math.abs(y - ( transformed ? n.yTransformed : yPx(n.y))) < cutoffY;
		});
	return nearBy.length > 0 ? _.min(nearBy, n => Math.abs(x - (n.xStart + n.xEnd) / 2.0)) : undefined;
}

function formatAf(af) {
	return (af === 'NA' || af === '' || af == null) ? null :
		Math.round(af * 100) + '%';
}

var fmtIf = (x, fmt, d = '' ) => x ? fmt(x) : d;
var dropNulls = rows => rows.map(row => row.filter(col => col != null)) // drop empty cols
	.filter(row => row.length > 0); // drop empty rows
var gbURL =  (assembly, pos) => `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${encodeURIComponent(assembly)}&position=${encodeURIComponent(pos)}`;

function sampleTooltip(sampleFormat, data, gene, assembly) {
	var dnaVaf = data.dna_vaf == null ? null : ['labelValue',  'DNA variant allele freq', formatAf(data.dna_vaf)],
		rnaVaf = data.rna_vaf == null ? null : ['labelValue',  'RNA variant allele freq', formatAf(data.rna_vaf)],
		ref = data.reference && ['value', `${data.reference} to `],
		altPos = data.alt && structuralVariantClass(data.alt) &&
			`chr${chromFromAlt(data.alt)}:${posFromAlt(data.alt)}-${posFromAlt(data.alt)}`,
		alt = data.alt && (structuralVariantClass(data.alt) ?
							['url', `${data.alt}`, gbURL(assembly, altPos)] :
							['value', `${data.alt}`]),
		pos = data && `${data.chr}:${util.addCommas(data.start)}-${util.addCommas(data.end)}`,
		posDisplay = data && (data.start === data.end) ? `${data.chr}:${util.addCommas(data.start)}` : pos,
		posURL = ['url',  `${assembly} ${posDisplay}`, gbURL(assembly, pos)],
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

function makeRow(fields, sampleGroup, row) {
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

function tooltip(nodes, samples, sampleFormat, {height, count, index}, gene, assembly, ev) {
	var {x, y} = util.eventOffset(ev),
		pixPerRow = height / count,
		yIndex = Math.round((y - pixPerRow / 2) / pixPerRow + index),
		node = closestNode(nodes, pixPerRow, index, count, x, y);

	return node ?
		sampleTooltip(sampleFormat, node.data, gene, assembly) :
		{sampleID: sampleFormat(samples[yIndex])};
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
						open: true,
						point: {x: ev.clientX, y: ev.clientY}
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
		var {column: {nodes, fields, assembly}, samples, sampleFormat, zoom} = this.props;
		return tooltip(nodes, samples, sampleFormat, zoom, fields[0], assembly, ev);
	},
	render: function () {
		var {column, samples, zoom, data, index} = this.props,
			feature = _.getIn(column, ['sFeature']),
			metaData = _.getIn(column, ['datasetMetadata'])[0],
			host = JSON.parse(metaData.dsID).host,
			customColor;

		if (metaData.color) {
			var customColorFile = host + "/download/" + metaData.color;
			Rx.DOM.ajax({'url': customColorFile, 'async': false, 'method': 'GET'}).subscribe(function(resp) {
				customColor = JSON.parse(resp.responseText);
			});
		}

		// XXX Make plot a child instead of a prop? There's also legend.
		return (
			<CanvasDrawing
					ref='plot'
					draw={drawMutations}
					wrapperProps={{
						className: 'Tooltip-target',
						onMouseMove: this.ev.mousemove,
						onMouseOut: this.ev.mouseout,
						onMouseOver: this.ev.mouseover,
						onClick: this.props.onClick
					}}
					feature={feature}
					customColor={customColor}
					nodes={column.nodes}
					strand={column.strand}
					width={column.width}
					data={data}
					index={index}
					samples={samples}
					xzoom={column.zoom}
					zoom={zoom}/>);
	}
}));

var getColumn = props => <MutationColumn {...props} />;
widgets.column.add('mutation', getColumn);

widgets.legend.add('mutation', drawLegend);
