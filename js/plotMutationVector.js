/*global require: false, document: false */
'use strict';

var _ = require('./underscore_ext');
var React = require('react');
var Column = require('./Column');
var Legend = require('./Legend');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');

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

var MutationColumn = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	render: function () {
		var {column, samples, zoom, data, index} = this.props,
			feature = _.getIn(column, ['sFeature']);
		// XXX Make plot a child instead of a prop?
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
