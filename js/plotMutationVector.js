/*global require: false, document: false, console: false */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var mutationVector = require('./mutationVector');
var xenaQuery = require('./xenaQuery');
var React = require('react');
var Column = require('./Column');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var vgcanvas = require('vgcanvas');
var widgets = require('columnWidgets');
var intervalTree = require('static-interval-tree');

var {pxTransformFlatmap} = require('layoutPlot');
var exonLayout = require('./exonLayout');

////////////////////////////////////////////////////////////
// XXX Move to model

function cmpRowOrNoVariants(v1, v2, refGene) {
	if (v1.length === 0) {
		return (v2.length === 0) ? 0 : 1;
	}
	return (v2.length === 0) ? -1 : mutationVector.rowOrder(v1, v2, refGene);
}

function cmpRowOrNull(v1, v2, refGene) {
	if (v1 == null) {
		return (v2 == null) ? 0 : 1;
	}
	return (v2 == null) ? -1 : cmpRowOrNoVariants(v1, v2, refGene);
}

function cmpSamples(probes, data, refGene, s1, s2) {
	return _.findValue(probes, function (f) {
		// XXX check this null condition.
		return data && refGene && refGene[f] ?
			cmpRowOrNull(data[s1], data[s2], refGene) : 0;
	});
}

function cmp({fields}, {req: {samples}, refGene}) {
	return (s1, s2) => cmpSamples(fields, samples, refGene, s1, s2);
}

var sparseDataValues = xenaQuery.dsID_fn(xenaQuery.sparse_data_values);
var refGeneExonValues = xenaQuery.dsID_fn(xenaQuery.refGene_exon_values);

// XXX hard-coded for now
var refGene = JSON.stringify({
	host: "https://genome-cancer.ucsc.edu/proj/public/xena",
	name: "common/GB/refgene_good"
});

function fetch({dsID, fields}, samples) {
		return Rx.Observable.zipArray(
			sparseDataValues(dsID, fields, samples),
			refGeneExonValues(refGene, fields)
		).map(resp => _.object(['req', 'refGene'], resp));
}

function dataToDisplay({fields}, vizSettings, {req: {rows}}) {
	return {
		index: intervalTree.index(rows)
		// should compute index by sample here, when we have selectors.
	};
}


////////////////////////////////////////////////////////////////
// view

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

		console.log('ppr', pixPerRow);
		if (pixPerRow > 2){ // centers when there is enough vertical room for each sample
			console.log('center');
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

var unknownEffect = 0,
	impact = {
		'Nonsense_Mutation': 3,
		'frameshift_variant': 3,
		'stop_gained': 3,
		'splice_acceptor_variant': 3,
		'splice_donor_variant': 3,
		'Splice_Site': 3,
		'Frame_Shift_Del': 3,
		'Frame_Shift_Ins': 3,

		'splice_region_variant': 2,
		'missense': 2,
		'non_coding_exon_variant': 2,
		'missense_variant': 2,
		'Missense_Mutation': 2,
		'exon_variant': 2,
		'RNA': 2,
		'Indel': 2,
		'start_lost': 2,
		'start_gained': 2,
		'De_novo_Start_OutOfFrame': 2,
		'Translation_Start_Site': 2,
		'De_novo_Start_InFrame': 2,
		'stop_lost': 2,
		'Nonstop_Mutation': 2,
		'initiator_codon_variant': 2,
		'5_prime_UTR_premature_start_codon_gain_variant': 2,
		'disruptive_inframe_deletion': 2,
		'inframe_deletion': 2,
		'inframe_insertion': 2,
		'In_Frame_Del': 2,
		'In_Frame_Ins': 2,

		'synonymous_variant': 1,
		'5_prime_UTR_variant': 1,
		'3_prime_UTR_variant': 1,
		"5'Flank": 1,
		"3'Flank": 1,
		"3'UTR": 1,
		"5'UTR": 1,
		'Silent': 1,
		'stop_retained_variant': 1,
		'upstream_gene_variant': 1,
		'downstream_gene_variant': 1,
		'intron_variant': 1,
		'Intron': 1,
		'intergenic_region': 1,
		'IGR': 1,

		"others": 0
	},
	colorStr = c =>
		'rgba(' + c.r + ', ' + c.g + ', ' + c.b + ', ' + c.a.toString() + ')',
	saveUndef = f => v => v === undefined ? v : f(v),
	round = Math.round,
	decimateFreq = saveUndef(v => round(v * 31) / 32), // reduce to 32 vals
	colors = {
		category25: [
			{r: 255, g: 127, b: 14, a: 1},  // orange #ff7f0e
			{r: 44, g: 160, b: 44, a: 1},  // green #2ca02c
			{r: 31, g: 119, b: 180, a: 1}, // blue #1f77b4
			{r: 214, g: 39, b: 40, a: 1}  // red #d62728
		],
		af: {r: 255, g: 0, b: 0},
		grey: {r: 128, g: 128, b: 128, a: 1}
	},
	features = {
		impact: {
			get: (a, v) => impact[v.effect] || (v.effect ? unknownEffect : undefined),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : colors.category25[v])
		},
		'dna_vaf': {
			get: (a, v) => _.isUndefined(v.dna_vaf) || _.isNull(v.dna_vaf) ? undefined : decimateFreq(v.dna_vaf),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : _.assoc(colors.af, 'a', v))
		},
		'rna_vaf': {
			get: (a, v) => _.isUndefined(v.rna_vaf) || _.isNull(v.rna_vaf) ? undefined : decimateFreq(v.rna_vaf),
			color: v => colorStr(_.isUndefined(v) ? colors.grey : _.assoc(colors.af, 'a', v))
		}
	};

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

// XXX see comment in mutationVector:receiveData
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
				xzoom = {index: 0}, data: {refGene, display, req},
				width, feature} = this.props,
			vg = this.vg,
			layout;

		if (!refGene) {
			return;
		}

		layout = exonLayout.layout(_.values(refGene)[0], width, xzoom);

		if (vg.width() !== width) {
			vg.width(width);
		}

		if (vg.height() !== height) {
			vg.height(height);
		}

		draw(vg, {
			index: display.index,
			layout: layout,
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
				download={() => console.log('fixme')}
				column={column}
				zoom={zoom}
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

// XXX Move some of these to model
widgets.cmp.add('mutationVector', cmp);
widgets.fetch.add('mutationVector', fetch);
widgets.column.add('mutationVector', getColumn);
widgets.transform.add('mutationVector', dataToDisplay);
