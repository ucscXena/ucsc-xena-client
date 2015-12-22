/*global require: false, document: false */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var React = require('react');
var Column = require('./Column');
var Legend = require('./Legend');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');
var util = require('./util');

var features = require('./models/mutationVector');

var radius = 4;

// Group by consecutive matches, perserving order.
function groupByConsec(sortedArray, prop, ctx) {
	var cb = _.iteratee(prop, ctx);
	var last = {}, current; // init 'last' with a sentinel, !== to everything
	return _.reduce(sortedArray, (acc, el) => {
		var key = cb(el);
		if (key !== last) {
			current = [];
			last = key;
			acc.push(current);
		}
		current.push(el);
		return acc;
	}, []);
}

function push(arr, v) {
	arr.push(v);
	return arr;
}

function drawBackground(vg, width, height, pixPerRow, hasValue) {
	var ctx = vg.context(),
		[stripes] = _.reduce(
			groupByConsec(hasValue, _.identity),
			([acc, sum], g) =>
				[g[0] ? acc : push(acc, [sum, g.length]), sum + g.length],
			[[], 0]);

	vg.smoothing(false);
	vg.box(0, 0, width, height, 'white'); // white background

	ctx.beginPath();                      // grey for missing data
	stripes.forEach(([offset, len]) =>
		ctx.rect(
			0,
			(offset * pixPerRow),
			width,
			pixPerRow * len
	));
	ctx.fillStyle = 'grey';
	ctx.fill();
}

function drawImpactPx(vg, width, pixPerRow, color, variants) {
	var ctx = vg.context(),
		varByImp = groupByConsec(variants, v => v.group);

	_.each(varByImp, vars => {
		ctx.beginPath(); // halos
		_.each(vars, v => {
			var padding = Math.max(0, radius - (v.xEnd - v.xStart + 1) / 2.0);
			ctx.moveTo(v.xStart - padding, v.y);
			ctx.lineTo(v.xEnd + padding, v.y);
		});
		ctx.lineWidth = pixPerRow;
		ctx.strokeStyle = color(vars[0].group);
		ctx.stroke();

		if (pixPerRow > 2){ // centers when there is enough vertical room for each sample
			ctx.beginPath();
			_.each(vars, v => {
				ctx.moveTo(v.xStart, v.y);
				ctx.lineTo(v.xEnd, v.y);
			});
			ctx.lineWidth = pixPerRow / 8;
			ctx.strokeStyle = 'black';
			ctx.stroke();
		}
	});
}

function draw(vg, props) {
	var {width, height, feature, samples,
			nodes, zoomCount, samplesInDS} = props,
		pixPerRow = height / zoomCount, // XXX also appears in mutationVector
		minppr = Math.max(pixPerRow, 2),
		hasValue = samples.map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	drawImpactPx(vg, width, minppr, features[feature].color, nodes);
}

var CanvasDrawing = React.createClass({
	mixins: [deepPureRenderMixin],

	render: function () {
		if (this.vg) {
			this.draw();
		}
		return (
			<canvas
				className='Tooltip-target'
				onMouseMove={this.props.onMouseMove}
				onMouseOut={this.props.onMouseOut}
				onMouseOver={this.props.onMouseOver}
				onClick={this.props.onClick}
				onDblClick={this.props.onDblClick}
				ref='canvas' />
		);
	},
	componentDidMount: function () {
		var {width, zoom: {height}} = this.props;
		this.vg = vgcanvas(this.refs.canvas.getDOMNode(), width, height);
		this.draw();
	},

	draw: function () {
		var {zoom: {count, height},
				samples, data, nodes, width, feature, index} = this.props,
			vg = this.vg;

		if (!data) {
			return;
		}

		if (vg.width() !== width) {
			vg.width(width);
		}

		if (vg.height() !== height) {
			vg.height(height);
		}

		draw(vg, {
			nodes: nodes,
			samples: samples,
			samplesInDS: index.bySample,
			width: width,
			height: height,
			feature: feature,
			zoomCount: count
		});
	}
});

function drawLegend(feature) {
	var {colors, labels, align} = features[feature].legend;
	return (
		<Legend
			colors={['rgb(255,255,255)', ...colors]}
			labels={['no mutation', ...labels]}
			align={align}
			ellipsis='' />
	);
}

function closestNode(nodes, pixPerRow, x, y) {
	var cutoffX = radius,
		cutoffY = pixPerRow / 2.0,
		min = Number.POSITIVE_INFINITY,
		distance;

	return _.reduce(nodes, function (closest, n) {
		if ((Math.abs(y - n.y) < cutoffY) && (x > n.xStart - cutoffX) && (x < n.xEnd + cutoffX)) {
			distance = Math.pow((y - n.y), 2) + Math.pow((x - (n.xStart + n.xEnd) / 2.0), 2);
			if (distance < min) {
				min = distance;
				return n;
			} else {
				return closest;
			}
		}
		else {
			return closest;
		}
	}, undefined);
}

function formatAf(af) {
	return (af === 'NA' || af === '' || af == null) ? null :
		Math.round(af * 100) + '%';
}

var fmtIf = (x, fmt) => x ? fmt(x) : '';
var gbURL = 'http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&position=';
var dropNulls = rows => rows.map(row => row.filter(col => col != null)) // drop empty cols
	.filter(row => row.length > 0); // drop empty rows

function sampleTooltip(data, gene) {
	var dnaVaf = data.dna_vaf && ['labelValue',  'DNA variant allele freq', formatAf(data.dna_vaf)],
		rnaVaf = data.rna_vaf && ['labelValue',  'RNA variant allele freq', formatAf(data.rna_vaf)],
		refAlt = data.reference && data.alt && ['value', `${data.reference} to ${data.alt}`],
		pos = data && `${data.chr}:${util.addCommas(data.start)}-${util.addCommas(data.end)}`,
		posURL = ['url', `hg19 ${pos}`, gbURL + encodeURIComponent(pos)],
		effect = ['value', fmtIf(data.effect, x => `${x}, `) +  gene + //eslint-disable-line comma-spacing
					fmtIf(data.amino_acid, x => ` (${x})`)];

	return {
		rows: dropNulls([
			[effect],
			[posURL, refAlt],
			[dnaVaf],
			[rnaVaf]
		]),
		sampleID: data.sample
	};
}

function tooltip(nodes, samples, {height, count, index}, gene,  ev) {
	var {x, y} = util.eventOffset(ev),
		pixPerRow = height / count, // XXX also appears in mutationVector
		minppr = Math.max(pixPerRow, 2), // XXX appears multiple places
		node = closestNode(nodes, minppr, x, y);

	return node ?
		sampleTooltip(node.data, gene) :
		{sampleID: samples[Math.floor((y * count / height) + index)]};
}

var MutationColumn = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		this.events('mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = this.ev.mouseover.filter(ev => util.hasClass(ev.target, 'Tooltip-target'))
			.selectMany(() => {
				return this.ev.mousemove.takeUntil(this.ev.mouseout)
					.map(ev => ({data: this.tooltip(ev), open: true})) // look up current data
					.concat(Rx.Observable.return({open: false}));
			}).subscribe(this.props.tooltip);
	},
	componentWillUnmount: function () {
		this.ttevents.dispose();
	},
	tooltip: function (ev) {
		var {column: {nodes, fields}, samples, zoom} = this.props;
		return tooltip(nodes, samples, zoom, fields[0], ev);
	},
	render: function () {
		var {column, samples, zoom, data, index} = this.props,
			feature = _.getIn(column, ['sFeature']);

		// XXX Make plot a child instead of a prop? There's also legend.
		return (
			<Column
				callback={this.props.callback}
				id={this.props.id}
				download={() => console.log('fixme')} //eslint-disable-line no-undef
				column={column}
				zoom={zoom}
				data={data}
				plot={<CanvasDrawing
						ref='plot'
						onMouseMove={this.ev.mousemove}
						onMouseOut={this.ev.mouseout}
						onMouseOver={this.ev.mouseover}
						feature={feature}
						nodes={column.nodes}
						width={column.width}
						data={data}
						index={index}
						samples={samples}
						xzoom={column.zoom}
						zoom={zoom}/>}
				legend={drawLegend(feature)}
			/>
		);
	}
});

var getColumn = (props) => <MutationColumn {...props} />;

widgets.column.add('mutationVector', getColumn);
