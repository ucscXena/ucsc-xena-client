/*eslint-env browser */
/*global require: false, module: false, document: false */
'use strict';

var _ = require('./underscore_ext');
var Rx = require('rx');
var React = require('react');
var Column = require('./Column');
var Legend = require('./Legend');
var MenuItem = require('react-bootstrap/lib/MenuItem');
var {deepPureRenderMixin, rxEventsMixin} = require('./react-utils');
var widgets = require('./columnWidgets');
var util = require('./util');
var CanvasDrawing = require('./CanvasDrawing');
var features = require('./models/mutationVector');

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
	let {width, zoom: {count, height, index}, nodes} = props;
	if (!nodes) {
		vg.box(0, 0, width, height, "gray");
		return;
	}
	let {feature, samples, index: {bySample: samplesInDS}} = props,
		pixPerRow = height / count, // XXX also appears in mutationVector
		minppr = Math.max(pixPerRow, 2),
		hasValue = samples.slice(index, index + count).map(s => samplesInDS[s]);

	drawBackground(vg, width, height, pixPerRow, hasValue);
	drawImpactPx(vg, width, minppr, features[feature].color, nodes);
}

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
	var dnaVaf = data.dna_vaf == null ? null : ['labelValue',  'DNA variant allele freq', formatAf(data.dna_vaf)],
		rnaVaf = data.rna_vaf == null ? null : ['labelValue',  'RNA variant allele freq', formatAf(data.rna_vaf)],
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

function makeRow(fields, sampleGroup, row) {
	let fieldValue;
	if (_.isArray(sampleGroup) && sampleGroup.length === 0) {
		fieldValue = 'No mutation';
	}
	if (_.isEmpty(sampleGroup)) {
		sampleGroup = [row];
	}
	return _.flatmap(sampleGroup, row =>
		_.map(fields, f => (row && row[f]) || fieldValue));
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

function getRowFields(rows, sampleGroups, idFieldName) {
	if (_.isEmpty(sampleGroups)) {
		return []; // When no samples exist
	} else if (!_.isEmpty(rows)) {
		return _.keys(rows[0]); // When samples have mutation(s)
	} else {
		return [idFieldName, 'result']; // default fields for mutation-less samples
	}
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
	onDownload: function() {
		const SAMPLE_ID_FIELD = 'sample';
		let {data: {req: {rows}}, samples, index} = this.props,
			groupedSamples = _.getIn(index, ['bySample']) || [],
			rowFields = getRowFields(rows, groupedSamples, SAMPLE_ID_FIELD),
			allRows = _.map(samples, (sId) => {
				let alternateRow = {}; // only used for mutation-less samples
				alternateRow[SAMPLE_ID_FIELD] = sId;
				return makeRow(rowFields, groupedSamples[sId], alternateRow);
			});
		return [rowFields, allRows];
	},

	onMuPit: function () {
		// Construct the url, which will be opened in new window
		let rows = _.getIn(this.props, ['data', 'req', 'rows']),
			uriList = _.uniq(_.map(rows, n => `${n.chr}:${n.start.toString()}`)).join(','),
			url = `http://mupit.icm.jhu.edu/?gm=${uriList}`;

		window.open(url);
	},
	tooltip: function (ev) {
		var {column: {nodes, fields}, samples, zoom} = this.props;
		return tooltip(nodes, samples, zoom, fields[0], ev);
	},
	render: function () {
		var {column, samples, zoom, data, index, hasSurvival} = this.props,
			feature = _.getIn(column, ['sFeature']),
			disableMenu = data ? false : true,
			menuItemName = 'MuPIT View' + (disableMenu ? ' (loading..)' : '');

		// XXX Make plot a child instead of a prop? There's also legend.
		return (
			<Column
				callback={this.props.callback}
				id={this.props.id}
				hasSurvival={hasSurvival}
				download={this.onDownload} //eslint-disable-line no-undef
				column={column}
				zoom={zoom}
				menu={<MenuItem disabled={disableMenu} onSelect={this.onMuPit}>{menuItemName}</MenuItem>}
				data={data}
				plot={<CanvasDrawing
						ref='plot'
						draw={draw}
						wrapperProps={{
							className: 'Tooltip-target',
							onMouseMove: this.ev.mousemove,
							onMouseOut: this.ev.mouseout,
							onMouseOver: this.ev.mouseover,
							onClick: this.props.onClick
						}}
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
}));

var getColumn = (props) => <MutationColumn {...props} />;

widgets.column.add('mutationVector', getColumn);
