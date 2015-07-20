/*global require: false, document: false */
'use strict';

var _ = require('underscore_ext');
var Rx = require('rx');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');
var heatmapColors = require('heatmapColors');
var partition = require('partition');
var util = require('util');
var xenaQuery = require('xenaQuery');
var Legend = require('Legend');
var Column = require('Column');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;
var React = require('react');
var rxEventsMixin = require('./react-utils').rxEventsMixin;

require('rx-jquery');

// XXX might want to automatically wrap all of these in xenaQuery.
var datasetMetadata = xenaQuery.dsID_fn(xenaQuery.dataset_metadata);
var datasetProbeValues = xenaQuery.dsID_fn(xenaQuery.dataset_probe_values);
var datasetGenesValues = xenaQuery.dsID_fn(xenaQuery.dataset_genes_values);
var datasetGeneProbesValues = xenaQuery.dsID_fn(xenaQuery.dataset_gene_probe_values);
var datasetFeatureDetail = xenaQuery.dsID_fn(xenaQuery.dataset_feature_detail);
var datasetCodes = xenaQuery.dsID_fn(xenaQuery.code_list);
var fieldBounds = xenaQuery.dsID_fn(xenaQuery.field_bounds);

function hasClass(el, c) {
	return el.className.split(/ +/).indexOf(c) !== -1;
}

var each = _.each,
	map = _.map,
	filter = _.filter,
	isUndefined = _.isUndefined,
	zip = _.zip,
	range = _.range,
	bind = _.bind,
	find = _.find,
	uniq = _.uniq,
	scratch = vgcanvas(document.createElement('canvas'), 1, 1); // scratch buffer

function secondNotUndefined(x) {
	return !isUndefined(x[1]);
}

function second(x, y) {
	return y;
}

// need a Maybe
function saveUndefined(fn) {
	return function (v) {
		return isUndefined(v) ? v : fn(v);
	};
}

function subbykey(subtrahend, key, val) {
	return val - subtrahend[key];
}

function dataToHeatmap(sortedSamples, data, probes, transform) {
	if (!data) {
		return [];
	}
	return map(probes, function (p) {
		var suTrans = saveUndefined(v => transform(p, v));
		return map(sortedSamples, s => suTrans(_.getIn(data[p], [s])));
	});
}

function drawColumn(data, colorScale, boxfn) {
	var colors;

	if (colorScale) { // then there exist some non-null values
		// zip colors and their indexes, then filter out the nulls
		colors = filter(zip(range(data.length), map(data, colorScale)), secondNotUndefined);
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
// sort
//

function cmpNumberOrNull(v1, v2) {
	if (isUndefined(v1) && isUndefined(v2)) {
		return 0;
	} else if (isUndefined(v1)) {
		return 1;
	} else if (isUndefined(v2)) {
		return -1;
	}
	return v2 - v1;
}

function cmpSamples(probes, data, s1, s2) {
	var diff = data && find(probes, function (f) {
			return data[f] && cmpNumberOrNull(data[f][s1], data[f][s2]);
		});
	if (diff) {
		return cmpNumberOrNull(data[diff][s1], data[diff][s2]);
	} else {
		return 0;
	}
}

// XXX fix up mutation cmp, perhaps after merging from main
var cmp = ({fields}, {req: {values, probes}}) =>
	(s1, s2) => cmpSamples(probes || fields, values, s1, s2);

//
// data fetches
//

// index data by field, then sample
// XXX maybe build indexes against arrays, instead of ditching the arrays,
// so we can do on-the-fly stuff, like average, km, against an array.
function indexResponse(probes, samples, data) {
	var values = _.object(probes, _.map(probes, function (v, i) {
			return _.object(samples, _.map(data[i], xenaQuery.nanstr));
		})),
		mean = _.object(probes, _.map(data, _.meannan));

	return {values: values, mean: mean};
}

// XXX A better approach might be to update the other index* functions
// such that they always create the "probes" in the request.
//
// Currently for every other request there's a 1-1 correspondence between
// requested "fields" and the fields returned by the server, so we just
// use column.fields to drive the layout and sort. This query is different
// in that we request one thing (gene) and get back a list of things (probes
// in the gene). So we can't base layout and sort on column.fields. We instead
// put the field list into data.req.probes, in this function, and add complexity
// to render() and cmp() such that they prefer data.req.probes to column.fields.
// The alternative is to always create data.req.probes.
function indexProbeGeneResponse(samples, data) {
	var probes = data[0],
		vals = data[1];
	return _.extend({probes: probes}, indexResponse(probes, samples, vals));
}

function orderByQuery(genes, data) {
	var indx = _.invert(_.pluck(data, 'gene'));
	return _.map(genes, function (g) {
		var i = indx[g];
		return i && data[i].scores[0]; // XXX extra level of array in g.SCORES??
	});
}

function indexGeneResponse(genes, samples, data) {
	return indexResponse(genes, samples, orderByQuery(genes, data));
}

// fetch routines return a memoized query.

var fetch = ({dsID, fields}, samples) => Rx.Observable.zipArray(
		datasetProbeValues(dsID, samples, fields)
			.map(resp => indexResponse(fields, samples, resp)),
		datasetMetadata(dsID)
	).map(resp => _.object(['req', 'metadata'], resp));

var fetchGeneProbes = ({dsID, fields}, samples) => Rx.Observable.zipArray(
		datasetGeneProbesValues(dsID, samples, fields)
			.map(resp => indexProbeGeneResponse(samples, resp)),
		datasetMetadata(dsID)
	).map(resp => _.object(['req', 'metadata'], resp));

var fetchFeature = ({dsID, fields}, samples) => Rx.Observable.zipArray(
		datasetProbeValues(dsID, samples, fields)
			.map(resp => indexResponse(fields, samples, resp)),
		datasetFeatureDetail(dsID, fields),
		datasetCodes(dsID, fields),
		fieldBounds(dsID, fields)
	).map(resp => _.object(['req', 'features', 'codes', 'bounds'], resp));


var fetchGene = ({dsID, fields}, samples) => Rx.Observable.zipArray(
		datasetGenesValues(dsID, samples, fields)
			.map(resp => indexGeneResponse(fields, samples, resp)),
		datasetMetadata(dsID)
	).map(resp => _.object(['req', 'metadata'], resp));

//
// Tooltip
//

function plotCoords(ev) {
	var offset,
		x = ev.offsetX,
		y = ev.offsetY;
	// XXX test this on FF & move all this to util if we
	// still need it.
	if (x === undefined) { // fix up for firefox
		offset = util.eventOffset(ev);
		x = offset.x;
		y = offset.y;
	}
	return { x: x, y: y };
}

function prec(val) {
	var precision = 6,
		factor = Math.pow(10, precision);
	return Math.round((val * factor)) / factor;
}

// We're getting events with coords < 0. Not sure if this
// is a side-effect of the react event system. This will
// restrict values to the given range.
function bounded(min, max, x) {
	return x < min ? min : (x > max ? max : x);
}

function tooltip(heatmap, fields, column, codes, zoom, samples, ev) {
	var coord = plotCoords(ev),
		sampleIndex = bounded(0, samples.length, Math.floor((coord.y * zoom.count / zoom.height) + zoom.index)),
		sampleID = samples[sampleIndex],
		fieldIndex = bounded(0, fields.length, Math.floor(coord.x * fields.length / column.width)),
		field = fields[fieldIndex],
		fieldCodes = _.getIn(codes, [field]);

	var val = heatmap[fieldIndex][sampleIndex],
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
	val = (val === undefined || _.isNaN(val)) ? 'NA' : val;

	return {sampleID: sampleID,
		rows: [{label: label, val: val}].concat(
		(val !== 'NA' && !code) ?
			{label: 'Column mean', val: prec(_.meannan(heatmap[fieldIndex]))} : [])};
}

//
// Legends
//

function categoryLegend(dataIn, colorScale, codes) {
	if (!colorScale) {
		return {colors: [], labels: [], align: 'left'};
	}
	// only finds categories for the current data in the column
	var data = _.reject(uniq(dataIn), isUndefined).sort((v1, v2) =>  v1 - v2),
		categoryLength = 19, // XXX where does this come from?
		// zip colors and their indexes, then filter out the nulls
		colors = _.map(filter(zip(range(data.length), map(data, colorScale)), secondNotUndefined),
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
	var labels = colorScale ? colorScale.domain() : [],
		colors = colorScale ? _.map(labels, colorScale) : [];
	return {labels: labels, colors: colors};
}

function renderGenomicLegend(props) {
	var {metadata, settings, data, colorScale} = props;
	var {labels, colors} = legendFromScale(colorScale[0]);

	if (data.length === 0) { // no features to draw
		return <span/>;
	}

	if (colorScale.length > 1 && !_.getIn(settings, ['min'])) {
		colors = heatmapColors.defaultColors(metadata);
		labels = ["lower", "", "higher"];
	} else if (colorScale[0]) {
		if (labels.length === 4) {                // positive and negative scale
			labels = _.assoc(labels,
					0, "<" + labels[0],
					labels.length - 1, ">" + labels[labels.length - 1]);
		} else if (labels.length === 3) {
			if (colorScale[0].domain()[0] >= 0) { // positive scale
				labels = _.assoc(labels,
					labels.length - 1, ">" + labels[labels.length - 1]);
			} else {                              // negative scale
				labels = _.assoc(labels, 0, "<" + labels[0]);
			}
		}
	}

	return <Legend colors={colors} labels={labels} align='center' />;
}

function floatLegend(colorScale) {
	var {labels, colors} = legendFromScale(colorScale);
	return {labels: labels, colors: colors, align: 'center'};
}

function renderPhenotypeLegend(props) {
	var {data: [data], column: {fields}, codes, colorScale} = props;
	var legendProps;


	if (data && data.length === 0) { // no features to draw
		return <span />;
	}

	// We can use domain() for categorical, but we want to filter out
	// values not in the plot. Also, we build the categorical from all
	// values in the db (even those not in the plot) so that colors will
	// match in other datasets.
	if (data && codes && codes[fields[0]]) { // category
		legendProps = categoryLegend(data, colorScale[0], codes[fields[0]]);
	} else {
		legendProps = floatLegend(colorScale[0]);
	}

	return <Legend {...legendProps} />;
}

function legendMethod(dataType) {
	return dataType === 'clinicalMatrix' ? renderPhenotypeLegend : renderGenomicLegend;
}

var HeatmapLegend = React.createClass({
	mixins: [PureRenderMixin],
	render: function() {
		var {dataType} = this.props;
		return legendMethod(dataType)(this.props);
	}
});

//
// plot rendering
//

function definedOrDefault(v, def) {
	return _.isUndefined(v) ? def : v;
}

var CanvasDrawing = React.createClass({
	shouldComponentUpdate: () => false, // Disable react on canvas

	render: function () {
		return <canvas {...this.props} className='Tooltip-target' ref='canvas' />;
	},

	componentDidMount: function () {
		var {column: {width}, zoom: {height}} = this.props;
		this.vg = vgcanvas(this.refs.canvas.getDOMNode(), width, height);
		this.draw(this.props);
	},

	draw: function (props) {
		var {zoom: {index, count, height}, column: {width}, heatmapData, colors} = props,
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
			colors: colors
		});
	}
});

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
		<MenuItem eventKey="geneProbesMatrix" onSelect={cb}>Gene detail</MenuItem> :
		<MenuItem eventKey="geneMatrix" onSelect={cb}>Probe average</MenuItem>;
}

var HeatmapColumn = React.createClass({
	mixins: [rxEventsMixin, PureRenderMixin],
	componentWillMount: function () {
		this.events('mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = this.ev.mouseover.filter(ev => hasClass(ev.target, 'Tooltip-target'))
			.selectMany(() => {
				return this.ev.mousemove.takeUntil(this.ev.mouseout)
					.map(ev => ({data: this.tooltip(ev), open: true})) // look up current data
					.concat(Rx.Observable.return({open: false}));
			}).subscribe(this.props.tooltip);
	},
	componentWillUnmount: function () {
		this.ttevents.dispose();
	},
	onMode: function (newMode) {
		this.props.callback(['dataType', this.props.id, newMode]);
	},
	render: function () {
		var {samples, data, column, vizSettings = {}, zoom} = this.props,
			dsVizSettings = vizSettings[column.dsID],
			{features, codes, metadata} = data,
			mean = _.getIn(data, ["req", "mean"]),
			norm = {'none': false, 'subset': true},

			colnormalization = definedOrDefault(norm[_.getIn(dsVizSettings, ['colNormalization'])],
												_.getIn(metadata, ['colnormalization'])),
			fields = data.req.probes || column.fields, // prefer field list from server
			// XXX should we be pre-computing this,
			// instead of running subbykey each time??
			transform = (colnormalization && mean && _.partial(subbykey, mean)) || second,
			heatmapData = dataToHeatmap(samples, data.req.values, fields, transform),
			colors = map(fields, (p, i) => heatmapColors.range(
					metadata,
					dsVizSettings || {},
					_.getIn(features, [p]),
					_.getIn(codes, [p]),
					heatmapData[i])),
			download = _.partial(tsvProbeMatrix, heatmapData, samples, fields, codes),
			menu = supportsGeneAverage(column) ? modeMenu(column, this.onMode) : null;

		// XXX draw only if we have to
		if (this.refs.plot) { // Update elements not managed by react (canvas)
			// XXX find a better way to write this
			this.refs.plot.draw(_.assoc(this.props, 'colors', colors, 'heatmapData', heatmapData)); // XXX memoize
		}

		// save [heatmapData, fields, column, codes, zoom, samples] for tooltip
		this.tooltip = _.partial(tooltip, heatmapData, fields, column, codes, zoom, samples);
		return (
			<Column
				callback={this.props.callback}
				id={this.props.id}
				onViz={this.props.onViz}
				download={download}
				column={column}
				zoom={zoom}
				menu={menu}
				plot={<CanvasDrawing
						onMouseMove={this.ev.mousemove}
						onMouseOut={this.ev.mouseout}
						onMouseOver={this.ev.mouseover}
						onClick={this.props.onClick}
						onDblClick={this.props.onDblClick}
						ref='plot'
						{...this.props}
						colors={colors}
						heatmapData={heatmapData}/>}
				legend={<HeatmapLegend {...this.props}
						dataType={column.dataType}
						colorScale={colors}
						data={heatmapData}
						metadata={metadata}
						codes={codes}/>}
			/>
		);
	}
});
var getColumn = (props) => <HeatmapColumn {...props} />;

widgets.cmp.add("probeMatrix", cmp);
widgets.fetch.add("probeMatrix", fetch);
widgets.column.add("probeMatrix", getColumn);

widgets.cmp.add("geneProbesMatrix", cmp);
widgets.fetch.add("geneProbesMatrix", fetchGeneProbes);
widgets.column.add("geneProbesMatrix", getColumn);

widgets.cmp.add("geneMatrix", cmp);
widgets.fetch.add("geneMatrix", fetchGene);
widgets.column.add("geneMatrix", getColumn);

widgets.cmp.add("clinicalMatrix", cmp);
widgets.fetch.add("clinicalMatrix", fetchFeature);
widgets.column.add("clinicalMatrix", getColumn);
