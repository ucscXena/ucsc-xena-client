/*global define: false, document: false */
define(['underscore_ext',
		'jquery',
		'rx',
		'multi',
		'vgcanvas',
		'colorBar',
		'columnWidgets',
		'crosshairs',
		'heatmapColors',
		'partition',
		'tooltip',
		'util',
		'xenaQuery',
		'Legend',
		'Column',
		'react',
		'rx-jquery'
	], function (
		_,
		$,
		Rx,
		multi,
		vgcanvas,
		colorBar,
		widgets,
		crosshairs,
		heatmapColors,
		partition,
		tooltip,
		util,
		xenaQuery,
		Legend,
		ColumnMixin,
		React) {

	"use strict";

	var each = _.each,
		map = _.map,
		filter = _.filter,
		isUndefined = _.isUndefined,
		zip = _.zip,
		range = _.range,
		bind = _.bind,
		find = _.find,
		uniq = _.uniq,
		scratch = vgcanvas(document.createElement('canvas'), 1, 1), // scratch buffer
		cmp,
		fetch,
		fetchGene,
		fetchGeneProbes,
		fetchFeature;

	function meannan(values) {
		var count = 0, sum = 0;
		if (!values) {
			return NaN;
		}
		sum = _.reduce(values, function (sum, v) {
			if (!isNaN(v)) {
				count += 1;
				return sum + v;
			}
			return sum;
		}, 0);
		if (count > 0) {
			return sum / count;
		}
		return NaN;
	}

	function secondNotUndefined(x) {
		return !isUndefined(x[1]);
	}

	function second(x, y) {
		return y;
	}

	function getProperty(obj, key) {
			return obj && obj[key];
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
			return map(sortedSamples, s => suTrans(getProperty(data[p], s)));
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

	// If we request a new view & we deprecate the old data, then the
	// sort changes. Then we rerender w/no usable sort order.

	// need original sample list & field list. Should index when we
	// get the data.
	// XXX Should have this return a closure with the data lookup, so we
	// don't repeat it every time.
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

	cmp = () => {
		var cmpm = _.memoize1((colFields, data, probes) => {
			var fields = probes || colFields;
			return (s1, s2) => cmpSamples(fields, data, s1, s2);
		});

		return ({fields}, {req: {values, probes}}) => cmpm(fields, values, probes);
	};

	// index data by field, then sample
	// XXX maybe build indexes against arrays, instead of ditching the arrays,
	// so we can do on-the-fly stuff, like average, km, against an array.
	function indexResponse(probes, samples, data) {
		var values = _.object(probes, _.map(probes, function (v, i) {
				return _.object(samples, _.map(data[i], xenaQuery.nanstr));
			})),
			mean = function () {
				return _.object(probes, _.map(data, function (v, i) {
					return meannan(v);
				}));
			};

		return {values: values, mean: _.memoize(mean)};
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

//	function rowToObj(cols) {
//		return _.reduce(cols, function (acc, col) {
//			acc[col[0]] = col[1];
//			return acc;
//		}, {});
//	}

	function indexFeatures(xhr) {
		var features = JSON.parse(xhr.response);
		return _.reduce(features, function (acc, row) {
			acc[row.name] = row;
			return acc;
		}, {});
	}

	function indexCodes(xhr) {
		var codes = JSON.parse(xhr.response);
		return _.object(_.map(codes, function (row) {
			return [row.name, row.code && row.code.split('\t')];
		}));
	}

	function indexBounds(bounds) {
		return _.object(_.map(bounds, function (row) {
			return [row.field, row];
		}));
	}

	// Where do we get the URL? XXX
	//    URL is associated with the dataset, per-sample.
	//    Have to parse the URL to get the server??
	//    A polymorphic fn to know the server type (xena, tabix, etc...)
	// xena data is a 2d matrix, fields X samples, fields first.
	// two fields, three samples.
	// [[1.1, 2.1, 3.1], [4.2, 5.2, 6.2]]

	// Does the column need to decide which fields cause a
	// new fetch? Or can the caller? The column must decide.

	fetch = () => {
		var fetches = _.memoize1(xenaQuery.dsID_fn((host, ds, probes, samples) => ({
			req: xenaQuery.reqObj(
				 xenaQuery.xena_post(host, xenaQuery.dataset_probe_string(ds, samples, probes)),
				 r => Rx.DOM.ajax(r).select(_.compose(_.partial(indexResponse, probes, samples), xenaQuery.json_resp))),
			metadata: xenaQuery.reqObj(
				xenaQuery.xena_post(host, xenaQuery.dataset_string(ds)),
				r => Rx.DOM.ajax(r).select(xenaQuery.json_resp))
		})));
		return ({dsID, fields}, samples) => fetches(dsID, fields, samples);
	};

	fetchGeneProbes = () => {
		var fetches = _.memoize1(xenaQuery.dsID_fn((host, ds, probes, samples) => ({
			req: xenaQuery.reqObj(
				 xenaQuery.xena_post(host, xenaQuery.dataset_gene_probes_string(ds, samples, probes)),
				 r => Rx.DOM.ajax(r).select(_.compose(_.partial(indexProbeGeneResponse, samples), xenaQuery.json_resp))),
			metadata: xenaQuery.reqObj(
				xenaQuery.xena_post(host, xenaQuery.dataset_string(ds)),
				r => Rx.DOM.ajax(r).select(xenaQuery.json_resp))
		})));
		return ({dsID, fields}, samples) => fetches(dsID, fields, samples);
	};

	fetchFeature = () => {
		var fetches = _.memoize1(xenaQuery.dsID_fn((host, ds, probes, samples) => ({
			req: xenaQuery.reqObj(
				 xenaQuery.xena_post(host, xenaQuery.dataset_probe_string(ds, samples, probes)),
				 r => Rx.DOM.ajax(r).select(_.compose(_.partial(indexResponse, probes, samples), xenaQuery.json_resp))),
			features: xenaQuery.reqObj(
				xenaQuery.xena_post(host, xenaQuery.features_string(ds, probes)),
				r => Rx.DOM.ajax(r).select(indexFeatures)),
			codes: xenaQuery.reqObj(
				xenaQuery.xena_post(host, xenaQuery.codes_string(ds, probes)),
				r => Rx.DOM.ajax(r).select(indexCodes)),
			bounds: xenaQuery.reqObj(
				xenaQuery.xena_post(host, xenaQuery.field_bounds_string(ds, probes)),
				r => Rx.DOM.ajax(r).select(_.compose(indexBounds, xenaQuery.json_resp)))
		})));
		return ({dsID, fields}, samples) => fetches(dsID, fields, samples);
	};

	fetchGene = () => {
		var fetches = _.memoize1(xenaQuery.dsID_fn((host, ds, fields, samples) => ({
			req: xenaQuery.reqObj(
				 xenaQuery.xena_post(host, xenaQuery.dataset_gene_string(ds, samples, fields)),
				 r => Rx.DOM.ajax(r).select(_.compose(_.partial(indexGeneResponse, fields, samples), xenaQuery.json_resp))),
			metadata: xenaQuery.reqObj(
				 xenaQuery.xena_post(host, xenaQuery.dataset_string(ds)),
				 r => Rx.DOM.ajax(r).select(xenaQuery.json_resp))
		})));
		return ({dsID, fields}, samples) => fetches(dsID, fields, samples);
	};

//	function plotCoords(ev) {
//		var offset,
//			x = ev.offsetX,
//			y = ev.offsetY;
//		if (x === undefined) { // fix up for firefox
//			offset = util.eventOffset(ev);
//			x = offset.x;
//			y = offset.y;
//		}
//		return { x: x, y: y };
//	}

//	function prec(val) {
//		var precision = 6,
//			factor = Math.pow(10, precision);
//		return Math.round((val * factor)) / factor;
//	}

//	function mousing(ev) {
//		var heatmapData = ev.data.plotData.heatmapData,
//			fields = ev.data.plotData.fields,
//			column = ev.data.column,
//			codes = ev.data.plotData.codes[column.fields[0]],
//			ws = ev.data.ws,
//			mode = 'genesets',
//			rows = [],
//			coord,
//			sampleIndex,
//			fieldIndex,
//			field,
//			label,
//			val,
//			tip = {
//				ev: ev,
//				el: '#nav',
//				my: 'top',
//				at: 'top',
//				mode: mode
//			};
//
//		if (tooltip.frozen()) {
//			return;
//		}
//		if (ev.type === 'mouseleave') {
//			tooltip.hide();
//			return;
//		}
//		coord = plotCoords(ev);
//		sampleIndex = Math.floor((coord.y * ws.zoomCount / ws.height) + ws.zoomIndex);
//		fieldIndex = Math.floor(coord.x * fields.length / ws.column.width);
//		tip.sampleID = ev.data.plotData.samples[sampleIndex];
//		field = fields[fieldIndex];
//
//		if (column.dataType === 'geneProbesMatrix') {
//			label = column.fields[0] + ' (' + field + ')';
//		} else if (column.dataType === 'clinicalMatrix') {
//			label = column.fieldLabel.default;
//		} else {
//			label = field;
//		}
//		val = heatmapData[fieldIndex][sampleIndex];
//		val = (column.dataType === 'clinicalMatrix' && codes)? codes[val]: prec(val);
//		if (val === undefined || _.isNaN(val)) {
//			val = 'NA';
//		}
//		rows.push({ label: label, val: val });
//		if (column.dataType === 'clinicalMatrix') {
//			tip.valWidth = '25em';
//		} else {
//			tip.labelWidth = '8em';
//			tip.valWidth = '15em';
//		}
//		if (val !== 'NA' && column.dataType !== 'clinicalMatrix') {
//			rows.push({ label: 'Column mean', val: prec(meannan(heatmapData[fieldIndex])) });
//		}
//		tip.rows = rows;
//		tooltip.mousing(tip);
//	}

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

	// XXX memoize
	var GenomicLegend = React.createClass({
		render: function() {
			var {metadata, settings, data, colorScale} = this.props;
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
	});

	function floatLegend(colorScale) {
		var {labels, colors} = legendFromScale(colorScale);
		return {labels: labels, colors: colors, align: 'center'};
	}

	// XXX need to rework handling of defaults, perhaps by
	// using babel default syntax. Where should defaults be set?
	// With each function? Or at an entry point?
	// XXX ellipsis -- test with sampleName, etc.
	var PhenotypeLegend = React.createClass({
		render: function() {
			var {data: [data], rendering: {fields}, codes, colorScale} = this.props;
			var props;


			if (data && data.length === 0) { // no features to draw
				return <span />;
			}

			// XXX can we use domain() for categorical?
			if (data && codes && codes[fields[0]]) { // category
				props = categoryLegend(data, colorScale[0], codes[fields[0]]);
			} else {
				props = floatLegend(colorScale[0]);
			}

			return <Legend {...props} />;
		}
	});
//
//
//
//			if (columnUi && heatmapData.length) {
//				columnUi.plotData = {
//					// TODO we don't need all these parms
//					serverData: data.req.values,
//					heatmapData: heatmapData,
//					column: column,
//					samples: sort,
//					fields: fields,
//					codes: codes
//				};
//				columnUi.ws = _.assoc(newws, 'colors', colors); // XXX this is horrible
//				columnUi.setPlotted();
//				if (local.sub) {
//					local.sub.dispose();
//				}
//				local.sub = columnUi.crosshairs.mousingStream.subscribe(function (ev) {
//					ev.data = {
//						plotData: columnUi.plotData,
//						column: column,
//						ws: newws   // XXX this is horrible
//					};
//					mousing(ev);
//				}); // TODO free this somewhere, maybe by moving it to columnUi.js
//			}
			// XXX Merging column & metadata so we get both dataType and type. The
			// type, dataSubType, dataType thing needs to be fixed.
//			drawLegend(_.extend({}, column, metadata), settings, columnUi, heatmapData, fields, codes, colors);

	function definedOrDefault(v, def) {
		return _.isUndefined(v) ? def : v;
	}

	var CanvasDrawing = React.createClass({
		shouldComponentUpdate: () => false, // Disable react on canvas

		render: () => <canvas ref='canvas' />,

		componentDidMount: function () {
			var {rendering: {width}, zoom: {height}} = this.props;
			this.vg = vgcanvas(this.refs.canvas.getDOMNode(), width, height);
			this.draw(this.props);
		},

		// XXX rename state as columnOrder and columns, instead of columnRendering
		// XXX rename prop as column instead of rendering
		draw: function (props) {
			var {zoom, rendering, heatmapData, colors} = props,
				column = rendering, // XXX rename?
				vg = this.vg;

			if (vg.width() !== column.width) {
				vg.width(column.width);
			}

			if (vg.height() !== zoom.height) {
				vg.height(zoom.height);
			}

			renderHeatmap({
				vg: vg,
				height: zoom.height,
				width: column.width,
				zoomIndex: zoom.index,
				zoomCount: zoom.count,
				data : heatmapData,
				layout: partition.offsets(column.width, 0, heatmapData.length),
				colors: colors
			});
		}
	});

	var HeatmapColumn = React.createClass({
		mixins: [ColumnMixin],
		render: function () {
			var {samples, data, rendering, settings} = this.props,
				column = rendering, // XXX rename?
				{features, codes, metadata} = data,
				mean = _.getIn(data, ["req", "mean"]),
				norm = {'none': false, 'subset': true},

				colnormalization = definedOrDefault(norm[_.getIn(settings, ['colNormalization'])], _.getIn(metadata, ['colnormalization'])),
				fields = data.req.probes || column.fields, // prefer field list from server
				transform = (colnormalization && mean && _.partial(subbykey, mean())) || second,
				heatmapData,
				colors;

			heatmapData = dataToHeatmap(samples, data.req.values, fields, transform);
			colors = map(fields, (p, i) => heatmapColors.range(
					metadata,
					settings || {},
					_.getIn(features, [p]),
					_.getIn(codes, [p]),
					heatmapData[i]));

			if (this.refs.plot) {
				// XXX find a better way to write this
				this.refs.plot.draw(_.assoc(this.props, 'colors', colors, 'heatmapData', heatmapData)); // XXX memoize
			}
			return this.renderColumn(
					<CanvasDrawing ref='plot' {...this.props} colors={colors} heatmapData={heatmapData}/>,
					// XXX refactor into one HeatmapLegend + different calls to
					// build the legend?
					column.dataType === 'clinicalMatrix' ? // XXX use a multi here? Or map, or something?
						<PhenotypeLegend {...this.props} colorScale={colors} data={heatmapData} metadata={metadata} codes={codes}/> :
						<GenomicLegend {...this.props} colorScale={colors} data={heatmapData} metadata={metadata}/>
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
});
