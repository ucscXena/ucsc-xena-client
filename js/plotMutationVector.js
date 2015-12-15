/*global require: false, document: false */
'use strict';

var _ = require('./underscore_ext');
var React = require('react');
var Column = require('./Column');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');
var intervalTree = require('static-interval-tree');

var {pxTransformFlatmap} = require('layoutPlot');
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

// Group by, returning groups in sorted order. Scales O(n) vs.
// sort's O(n log n), if the number of values is much smaller than
// the number of elements.
function sortByGroup(arr, keyfn) {
	var grouped = _.groupBy(arr, keyfn);
	return _.map(_.sortBy(_.keys(grouped), _.identity),
			k => grouped[k]);
}

// In the old code 'nodes' is used for mousing. Should we instead use the index? Find variants
// within one radius of the mouse, then filter by y position.
function findNodes(index, layout, samples, zoomIndex, zoomCount, pixPerRow, feature) {
	var sindex = _.object(samples.slice(zoomIndex, zoomIndex + zoomCount),
					_.range(samples.length)),
		group = features[feature].get,
		minSize = ([s, e]) => [s, e - s < 1 ? s + 1 : e],
		// sortfn is about 2x faster than sortBy, for large sets of variants
		sortfn = (coll, keyfn) => _.flatten(sortByGroup(coll, keyfn), true);
	return sortfn(pxTransformFlatmap(layout, (toPx, [start, end]) => {
		var variants = _.filter(
			intervalTree.matches(index, {start: start, end: end}),
			v => _.has(sindex, v.sample));
		return _.map(variants, v => {
			var [pstart, pend] = minSize(toPx([v.start, v.end]));
			return {
				xStart: pstart,
				xEnd: pend,
				y: sindex[v.sample] * pixPerRow + (pixPerRow / 2),
			   // XXX 1st param to group was used for extending our coloring to other annotations. See
			   // ga4gh branch.
			   group: group(null, v),                                   // needed for sort, before drawing.
			   data: v
			};
		});
	}), v => v.group);
}

function draw(vg, props) {
	var {index, layout, width, height, feature, samples, zoomIndex,
			zoomCount, samplesInDS} = props,
		pixPerRow = height / zoomCount,
		minppr = Math.max(pixPerRow, 2),
		nodes = findNodes(index, layout, samples, zoomIndex, zoomCount, pixPerRow, feature),
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
		var {zoom: {index, count, height}, samples,
				data: {refGene, display, req},
				width, feature} = this.props,
			vg = this.vg;

		if (!refGene) {
			return;
		}

		if (vg.width() !== width) {
			vg.width(width);
		}

		if (vg.height() !== height) {
			vg.height(height);
		}

		draw(vg, {
			index: display.index,
			layout: display.layout,
			samples: samples,
			samplesInDS: req.samples,
			width: width,
			height: height,
			feature: feature,
			zoomIndex: index,
			zoomCount: count
		});
	}
});

var MutationColumn = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	render: function () {
		var {column, samples, zoom, data} = this.props;
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
						feature={_.getIn(column, ['sFeature'])}
						width={_.getIn(column, ['width'])}
						data={data}
						samples={samples}
						xzoom={_.getIn(column, ['zoom'])}
						zoom={zoom}/>}
				legend={'legend'}
			/>
		);
	}
});

var getColumn = (props) => <MutationColumn {...props} />;

widgets.column.add('mutationVector', getColumn);
