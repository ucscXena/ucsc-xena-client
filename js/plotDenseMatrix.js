/*global require: false, document: false, module: false */
'use strict';

var _ = require('underscore_ext');
var Rx = require('rx');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');
var heatmapColors = require('heatmapColors');
var partition = require('partition');
var util = require('util');
var Legend = require('Legend');
var Column = require('Column');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var React = require('react');
var ReactDOM = require('react-dom');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');

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

var each = _.each,
	map = _.map,
	filter = _.filter,
	zip = _.zip,
	range = _.range,
	bind = _.bind,
	uniq = _.uniq,
	scratch = vgcanvas(document.createElement('canvas'), 1, 1); // scratch buffer

function secondExists(x) {
	return x[1] != null;
}

var colorFns = vs => _.map(vs, heatmapColors.colorScale);

function drawColumn(data, colorScale, boxfn) {
	var colors;

	if (colorScale) { // then there exist some non-null values
		// zip colors and their indexes, then filter out the nulls
		colors = filter(zip(range(data.length), map(data, colorScale)), secondExists);
		each(colors, bind(boxfn.apply, boxfn, null));
	}
}

// The browsers want to smooth our images, which messes them up. We avoid
// certain scaling operations to prevent this.
// If there are more values than pixels, draw at one-pixel-per-value
// to avoid sub-pixel aliasing, then scale down to the final size with
// drawImage(). If there are more pixels than values, draw at an integer
// scale per-value, giving us an image larger than the final size, then scale
// down to avoid blurring.
// We can ditch this complexity when all the browsers allow us to disable
// smoothing.
// index & count are floating point.
function pickScale(index, count, height, data) {
	var first = Math.floor(index),
		last  = Math.ceil(index + count),
		d = data.slice(first, last), // XXX use a typed array view?
		scale = (height >= d.length) ? Math.ceil(height / d.length) : 1,
		scaledHeight = d.length * scale || 1, // need min 1 px to draw gray when no data
		sy =  (index - first) * scale,
		sh = scale * count;

	return {
		data: d,                // subset of data to be drawn
		scale: scale,           // chosen scale that avoids blurring
		height: scaledHeight,
		sy: sy,                 // pixels off-screen at top of buffer
		sh: sh                  // pixels on-screen in buffer
	};
}

function renderHeatmap(opts) {
	var {vg, height, width, zoomIndex, zoomCount, layout, data, colors} = opts;

	vg.smoothing(false); // For some reason this works better if we do it every time.

	// reset image
	if (data.length === 0) { // no features to draw
		vg.box(0, 0, width, height, "gray");
		return;
	}

	each(layout, function (el, i) {
		var s = pickScale(zoomIndex, zoomCount, height, data[i]),
			colorScale = colors[i];

		scratch.height(s.height);
		scratch.box(0, 0, 1, s.height, "gray");
		scratch.scale(1, s.scale, function () {
			drawColumn(s.data, colorScale, function (i, color) {
				scratch.box(0, i, 1, 1, color);
			});
		});
		vg.translate(el.start, 0, function () {
			vg.drawImage(scratch.element(), 0, s.sy, 1, s.sh, 0, 0, el.size, height);
		});
	});
}


//
// Tooltip
//

var prec = (function () {
	var precision = 6,
		factor = Math.pow(10, precision);
	return val => (val == null) ? 'NA' : Math.round((val * factor)) / factor;
}());

// We're getting events with coords < 0. Not sure if this
// is a side-effect of the react event system. This will
// restrict values to the given range.
function bounded(min, max, x) {
	return x < min ? min : (x > max ? max : x);
}

var nn = (...args) => args.filter(x => x); // not "falsey" (null, undefined, false, etc.)

function tooltip(heatmap, fields, column, codes, zoom, samples, ev) {
	var coord = util.eventOffset(ev),
		sampleIndex = bounded(0, samples.length, Math.floor((coord.y * zoom.count / zoom.height) + zoom.index)),
		sampleID = samples[sampleIndex],
		fieldIndex = bounded(0, fields.length, Math.floor(coord.x * fields.length / column.width)),
		field = fields[fieldIndex],
		fieldCodes = _.getIn(codes, [field]);

	var val = _.getIn(heatmap, [fieldIndex, sampleIndex]),
		code = _.getIn(fieldCodes, [val]),
		label;

	if (fields.length === 1) {
		label = column.fieldLabel.default;
	} else if (fields.length === column.fields.length) {
		label = field;
	} else {
		label = column.fieldLabel.default + ' (' + field + ')';
	}

	val = code ? code : prec(val);

	return {
		sampleID: sampleID,
		rows: nn(
			[['labelValue', label, val]],
			(val !== 'NA' && !code) &&
				[['labelValue', 'Column mean', prec(_.meannan(heatmap[fieldIndex]))]])
	};
}

//
// Legends
//

// XXX missing data handled incorrectly on reload? Is this because NaN is miscoded in json?
function categoryLegend(dataIn, colorScale, codes) {
	if (!colorScale) {
		return {colors: [], labels: [], align: 'left'};
	}
	// only finds categories for the current data in the column
	var data = _.reject(uniq(dataIn), x => x == null).sort((v1, v2) =>  v1 - v2),
		categoryLength = 19, // XXX where does this come from?
		// zip colors and their indexes, then filter out the nulls
		colors = _.map(filter(zip(range(data.length), map(data, colorScale)), secondExists),
				c => c[1]),
		labels = map(data, d => codes[d]);
	return {colors: colors, labels: labels, align: 'left', ellipsis: data.length > categoryLength ? '...' : null};
}

// Color scale cases
//  1 - clinical data: single probe, auto-scaled
//    a - float
//    b - categorical
//  2 - genomic data: multiple probe, fixed scale or auto-scale each probe
//    a - fixed scale
//    b - auto-scale
//      1 - single probe
//      2 - multiple probe
//
// In all cases except 2.b.2 there is a single color scale. In that case
// we get the legend colors by mapping the domain to the scale. For clinical
// we take labels from the domain. For genomic, we show ranges with < >,
// taken from the domain.
//
// When there are multiple scales, 2.b.2, there are no meaningful numbers
// we can display as labels, so we use "higher", "lower". Rather than
// taking the colors by some sort of union over the different color scales,
// we ignore the scales and use the color setting of the column.
//
// This function should be refactored so there's no "fall through" case,
// so all cases are explicit. Also, meaningful intermediate variables
// should be created so intent is clear, e.g.
//
// colorScale.length > 1 && !_.getIn(settings, ['min'])
//
// means there are mutiple probes and the user has not set a fixed scale,
// i.e. we have multiple color scales.

// Basic legend, given a color scale.
function legendFromScale(colorScale) {
	var labels = colorScale.domain(),
		colors = _.map(labels, colorScale);
	return {labels: labels, colors: colors};
}

var cases = ([tag], arg, c) => c[tag](arg);

// We never want to draw multiple legends. If there are multiple scales,
// we do lower/higher. There are multiple scales if we have multiple probes
// *and* there's no viz settings. We need at most one color fn, from which we
// extract the domain & range.
function renderGenomicLegend(props) {
	var {dataset, colors, hasViz} = props,
		multiScaled = _.getIn(colors, [1]) && !hasViz,
		hasData = _.getIn(colors, [0]),
		labels, legendColors;

	if (multiScaled) {
		legendColors = heatmapColors.defaultColors(dataset);
		labels = ["lower", "", "higher"];
	} else if (hasData) { // one probe, or all colors are same (hasViz)
		var colorfn = heatmapColors.colorScale(colors[0]);
		var {labels: l, colors: c} = legendFromScale(colorfn);
		legendColors = c;
		labels = cases(colors[0], l, {
			'no-data': () => [],
			'float-thresh': ([nl, nh, pl, ph]) => ['<' + nl, nh, pl, '>' + ph],
			'float-thresh-pos': ([low, high]) => [low, '>' + high],
			'float-thresh-neg': ([low, high]) => ['<' + low, high]
		});
	} else { // no data
		legendColors = [];
		labels = [];
	}

	return <Legend colors={legendColors} labels={labels} align='center' />;
}

function floatLegend(colorScale) {
	var {labels, colors} = legendFromScale(colorScale);
	return {labels: labels, colors: colors, align: 'center'};
}

// Might have colorScale but no data (phenotype), no data & no colorScale,
// or data & colorScale, no colorScale &  data?
function renderPhenotypeLegend(props) {
	var {data: [data] = [], fields, codes, colors = []} = props;
	var legendProps;
	var colorfn = _.first(colorFns(colors.slice(0, 1)));

	// We can use domain() for categorical, but we want to filter out
	// values not in the plot. Also, we build the categorical from all
	// values in the db (even those not in the plot) so that colors will
	// match in other datasets.
	if (data && codes && codes[fields[0]] && colorfn) { // category
		legendProps = categoryLegend(data, colorfn, codes[fields[0]]);
	} else if (colorfn) {
		legendProps = floatLegend(colorfn);
	} else {
		return <span />;
	}

	return <Legend {...legendProps} />;
}

function legendMethod(dataType) {
	return dataType === 'clinicalMatrix' ? renderPhenotypeLegend : renderGenomicLegend;
}

var HeatmapLegend = hotOrNot(React.createClass({
	mixins: [deepPureRenderMixin],
	render: function() {
		var {dataType} = this.props;
		return legendMethod(dataType)(this.props);
	}
}));

//
// plot rendering
//

var CanvasDrawing = hotOrNot(React.createClass({
	mixins: [deepPureRenderMixin],

	render: function () {
		if (this.vg) {
			this.draw(this.props);
		}
		return (
			<canvas
				className='Tooltip-target'
				onMouseMove={this.props.onMouseMove}
				onMouseOut={this.props.onMouseOut}
				onMouseOver={this.props.onMouseOver}
				onClick={this.props.onClick}
				ref='canvas' />
		);
	},
	componentDidMount: function () {
		var {width, zoom: {height}} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, height);
		this.draw(this.props);
	},

	draw: function (props) {
		var {zoom: {index, count, height}, width, heatmapData = [], colors} = props,
			vg = this.vg;

		if (vg.width() !== width) {
			vg.width(width);
		}

		if (vg.height() !== height) {
			vg.height(height);
		}

		renderHeatmap({
			vg: vg,
			height: height,
			width: width,
			zoomIndex: index,
			zoomCount: count,
			data: heatmapData,
			layout: partition.offsets(width, 0, heatmapData.length),
			colors: colorFns(colors)
		});
	}
}));

function tsvProbeMatrix(heatmap, samples, fields, codes) {
	var fieldNames = ['sample'].concat(fields);
	var coded = _.map(fields, (f, i) => codes && codes[f] ?
			_.map(heatmap[i], _.propertyOf(codes[f])) :
			heatmap[i]);
	var transposed = _.zip.apply(null, coded);
	var tsvData = _.map(samples, (sample, i) => [sample].concat(transposed[i]));

// XXX
//	if (this.ws.column.dataType === 'clinicalMatrix') {
//		fieldNames = ['sample'].concat([this.ws.column.fieldLabel.default]);
//	}
	return [fieldNames, tsvData];
}

function supportsGeneAverage({dataType, fields: {length}}) {
	return ['geneProbesMatrix', 'geneMatrix'].indexOf(dataType) >= 0 && length === 1;
}

function modeMenu({dataType}, cb) {
	return dataType === 'geneMatrix' ?
		<MenuItem eventKey="geneProbesMatrix" onSelect={cb}>Detailed view</MenuItem> :
		<MenuItem eventKey="geneMatrix" onSelect={cb}>Gene average</MenuItem>;
}

var HeatmapColumn = hotOrNot(React.createClass({
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
	onMode: function (ev, newMode) {
		this.props.callback(['dataType', this.props.id, newMode]);
	},
	tooltip: function (ev) {
		var {samples, data, column, zoom} = this.props,
			codes = _.get(data, 'codes'),
			{heatmap} = column,
			fields = _.getIn(data, ['req', 'probes'], column.fields);
		return tooltip(heatmap, fields, column, codes, zoom, samples, ev);
	},
	// To reduce this set of properties, we could
	//    - Drop data & move codes into the 'display' obj, outside of data
	//    - Drop dataset, and add default colors to the 'display' obj.
	// Might also want to copy fields into 'display', so we can drop the || here.
	render: function () {
		var {samples, data, column, dataset, vizSettings = {}, zoom, hasSurvival} = this.props,
			{heatmap, colors} = column,
			codes = _.getIn(data, ['codes']),
			fields = _.getIn(data, ['req', 'probes'], column.fields),
			download = _.partial(tsvProbeMatrix, heatmap, samples, fields, codes),
			menu = supportsGeneAverage(column) ? modeMenu(column, this.onMode) : null;

		return (
			<Column
				callback={this.props.callback}
				id={this.props.id}
				onViz={this.props.onViz}
				hasSurvival={hasSurvival}
				download={download}
				column={column}
				zoom={zoom}
				menu={menu}
				plot={<CanvasDrawing
						ref='plot'
						onMouseMove={this.ev.mousemove}
						onMouseOut={this.ev.mouseout}
						onMouseOver={this.ev.mouseover}
						onClick={this.props.onClick}
						width={_.getIn(column, ['width'])}
						zoom={zoom}
						colors={colors}
						heatmapData={heatmap}/>}
				legend={<HeatmapLegend
						fields={_.getIn(column, ['fields'])}
						hasViz={!isNaN(_.getIn(vizSettings, ['min']))}
						dataType={column.dataType}
						colors={colors}
						data={heatmap}
						dataset={dataset}
						codes={codes}/>}
			/>
		);
	}
}));

var getColumn = (props) => <HeatmapColumn {...props} />;

widgets.column.add("probeMatrix", getColumn);
widgets.column.add("geneProbesMatrix", getColumn);
widgets.column.add("geneMatrix", getColumn);
widgets.column.add("clinicalMatrix", getColumn);
