'use strict';

var _ = require('./underscore_ext');
var React = require('react');
var ReactDOM = require('react-dom');
var Rx = require('./rx');
var intervalTree = require('static-interval-tree');
var vgcanvas = require('./vgcanvas');
var layoutPlot = require('./layoutPlot');
var {matches, index} = intervalTree;
var {pxTransformEach} = layoutPlot;
var {rxEventsMixin} = require('./react-utils');
var util = require('./util');
var {chromPositionFromScreen} = require('./exonLayout');

// annotate an interval with cds status
var inCds = ({cdsStart, cdsEnd}, intvl) =>
	_.assoc(intvl, 'inCds', intvl.start <= cdsEnd && cdsStart <= intvl.end);

// split an interval at pos if it overlaps
var splitOnPos = (pos, i) => (i.start < pos && pos <= i.end) ?
		[_.assoc(i, 'end', pos - 1), _.assoc(i, 'start', pos)] : i;

// create interval record
var toIntvl = (start, end, i) => ({start: start, end: end, i: i});

// Create drawing intervals, by spliting exons on cds bounds, and annotating if each
// resulting region is in the cds. Each region is also annotated by its index in the
// list of exons, so we can alternate colors when rendering.
//
// findIntervals(gene :: {cdsStart :: int, cdsEnd :: int, exonStarts :: [int, ...], exonEnds :: [int, ...]})
//     :: [{start :: int, end :: int, i :: int, inCds :: boolean}, ...]
function findIntervals(gene) {
	if (_.isEmpty(gene)) {
		return [];
	}
	var {cdsStart, cdsEnd, exonStarts, exonEnds} = gene;

	return _.map(_.flatmap(_.flatmap(_.zip(exonStarts, exonEnds),
									([s, e], i) => splitOnPos(cdsStart, toIntvl(s, e, i))),
							i => splitOnPos(cdsEnd + 1, i)),
				i => inCds(gene, i));
}

var shade1 = '#cccccc',
	shade2 = '#999999',
	shade3 = '#000080';

function getAnnotation (index, perLaneHeight, offset) {
	return {
		utr: {
			y: offset + perLaneHeight * (index + 0.25),
			h: perLaneHeight / 2
		},
		cds: {
			y: offset + perLaneHeight * index,
			h: perLaneHeight
		}
	};
}

function drawIntroArrows (ctx, xStart, xEnd, endY, segments, strand) {
	if (xEnd - xStart < 10) {
		return;
	}
	var arrowSize = 2, //arrowSize
		gapSize = 4;

	for (var i = xStart; i < xEnd; i = i + 10) {
		var found = segments.filter(seg => (Math.abs(seg[0] - i) < gapSize ||
				Math.abs(seg[0] - i - arrowSize) < gapSize ||
				Math.abs(seg[1] - i) < gapSize ||
				Math.abs(seg[1] - i - arrowSize) < gapSize));

		if (_.isEmpty(found)) {
			if (strand === '+') {
				ctx.beginPath();
				ctx.moveTo(i, endY - arrowSize);
				ctx.lineTo(i + arrowSize, endY );
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(i, endY + arrowSize);
				ctx.lineTo(i + arrowSize, endY );
				ctx.stroke();
			} else { // "-" strand
				ctx.beginPath();
				ctx.moveTo(i + arrowSize, endY - arrowSize);
				ctx.lineTo(i, endY );
				ctx.stroke();
				ctx.beginPath();
				ctx.moveTo(i + arrowSize, endY + arrowSize);
				ctx.lineTo(i, endY);
				ctx.stroke();
			}
		}
	}
}

var RefGeneAnnotation = React.createClass({
	mixins: [rxEventsMixin],

	draw: function (width, layout, mode, annotationLanes) {
		var {lanes, perLaneHeight, laneOffset, annotationHeight} = annotationLanes;

		// white background
		this.vg.box(0, 0, width, annotationHeight, 'white');

		if (!width || !layout) {
			return;
		}
		var vg = this.vg,
			ctx = vg.context();

		if (vg.width() !== width) {
			vg.width(width);
		}

		if ( _.isEmpty(layout.chrom) || _.isEmpty(lanes)) {
			return;
		}

		//drawing start here, one lane at a time
		lanes.forEach((lane, k) => {
			var annotation = getAnnotation(k, perLaneHeight, laneOffset);

			lane.forEach( val => {
				var intervals = findIntervals(val),
					indx = index(intervals),
					segments = [];

				//find segments for one gene
				pxTransformEach(layout, (toPx, [start, end]) => {
					var nodes = matches(indx, {start: start, end: end});
					nodes = nodes.sort((a, b)=> (a.start - b.start));
					_.each(nodes, ({i, start, end, inCds}) => {
						var {y, h} = annotation[inCds ? 'cds' : 'utr'];
						var [pstart, pend] = toPx([start, end]);
						var	shade = (mode === "geneExon") ? ((i % 2 === 1) ? shade1 : shade2)
							: ((mode === "coordinate") ? shade3 : shade2);
						segments.push([pstart, pend, shade, y, h]);
					});

					// draw a line across the gene
					ctx.fillStyle = shade2;
					var lineY = laneOffset + perLaneHeight * (k + 0.5);
					if (nodes.length === 0) {
						ctx.fillRect(0, lineY, width, 1);
						if (mode === 'coordinate') {
							drawIntroArrows (ctx, 0, width, lineY, segments, val.strand);
						}
					} else {
						var [pGeneStart, pGeneEnd] = toPx([nodes[0].start, nodes[nodes.length - 1].end]);
						if (nodes.length !== intervals.length) {
							if (nodes[0].start === intervals[0].start) {
								pGeneEnd = width;
							} else if (nodes[nodes.length - 1].start === intervals[intervals.length - 1].start) {
								pGeneStart = 0;
							}
							else {
								pGeneStart = 0;
								pGeneEnd = width;
							}
						}
						ctx.fillRect(pGeneStart, lineY, pGeneEnd - pGeneStart, 1);
						if (mode === 'coordinate') {
							drawIntroArrows (ctx, pGeneStart, pGeneEnd, lineY, segments, val.strand);
						}
					}
					// draw each segments
					_.each(segments, s => {
						var [pstart, pend, shade, y, h] = s;
						ctx.fillStyle = shade;
						ctx.fillRect(pstart, y, (pend - pstart) || 1, h);
					});
				});
			});
		});
	},
	componentWillMount: function () {
		this.events('mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = this.ev.mouseover
			.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.flatMap(() => {
				return this.ev.mousemove
					.takeUntil(this.ev.mouseout)
					.map(ev => ({
						data: this.tooltip(ev),
						open: true
					})) // look up current data
					.concat(Rx.Observable.of({open: false}));
			}).subscribe(this.props.tooltip);
	},
	componentWillUnmount: function () {
		this.ttevents.unsubscribe();
	},
	tooltip: function (ev) {
		var {layout, annotationLanes, column} = this.props,
			{x, y} = util.eventOffset(ev),
			{assembly} = column,
			{annotationHeight, perLaneHeight, laneOffset, lanes} = annotationLanes;

		var rows = [],
			assemblyString = encodeURIComponent(assembly),
			contextPadding = Math.floor((layout.chrom[0][1] - layout.chrom[0][0]) / 4),
			posLayout = `${layout.chromName}:${util.addCommas(layout.chrom[0][0])}-${util.addCommas(layout.chrom[0][1])}`,
			posLayoutPadding = `${layout.chromName}:${util.addCommas(layout.chrom[0][0] - contextPadding)}-${util.addCommas(layout.chrom[0][1] + contextPadding)}`,
			posLayoutString = encodeURIComponent(posLayout),
			posLayoutPaddingString = encodeURIComponent(posLayoutPadding),
			GBurlZoom = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${assemblyString}&highlight=${assemblyString}.${posLayoutString}&position=${posLayoutPaddingString}`;

		if (y > laneOffset && y < annotationHeight - laneOffset) {
			var posStart = chromPositionFromScreen(layout, x - 0.5),
				posEnd = chromPositionFromScreen(layout, x + 0.5),
				matches = [],
				laneIndex = Math.floor((y - laneOffset) / perLaneHeight); //find which lane by y

			lanes[laneIndex].forEach(val => {
				if ((posEnd >= val.txStart) && (posStart <= val.txEnd)) {
					matches.push(val);
				}
			});

			if (matches.length > 0)	{
				matches.forEach(match => {
					var posGene = `${match.chrom}:${util.addCommas(match.txStart)}-${util.addCommas(match.txEnd)}`,
						positionGeneString = encodeURIComponent(posGene),
						GBurlGene = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${assemblyString}&position=${positionGeneString}&enableHighlightingDialog=0`;

					rows.push([['value', 'Gene '], ['url', `${match.name2}`, GBurlGene]]);
				});
			}
		}

		rows.push([['value', 'Column'], ['url', `${assembly} ${posLayout}`, GBurlZoom]]);
		return {
			rows: rows
		};
	},
	componentDidMount: function () {
		var {width, layout, annotationLanes, mode} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, annotationLanes.annotationHeight);
		this.draw(width, layout, mode, annotationLanes);
	},

	render: function () {
		var {width, layout, annotationLanes, mode} = this.props;
		if (this.vg) {
			this.draw(width, layout, mode, annotationLanes);
		}

		return (
			<canvas
				className='Tooltip-target'
				onMouseMove={this.on.mousemove}
				onMouseOut={this.on.mouseout}
				onMouseOver={this.on.mouseover}
				onClick={this.props.onClick}
				onDblClick={this.props.onDblClick}
				ref='canvas' />
		);
	}
});

//widgets.annotation.add('gene', props => <RefGeneAnnotation {...props}/>);

module.exports = {
	findIntervals: findIntervals,
	RefGeneAnnotation: RefGeneAnnotation
};
