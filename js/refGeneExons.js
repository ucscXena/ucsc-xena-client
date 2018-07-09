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
var {rxEvents} = require('./react-utils');
var util = require('./util');
var {intronRegions, exonGroups} = require('./findIntrons');
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
export function findIntervals(gene) {
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

var probeLayout = (layout, positions) =>
	layoutPlot.pxTransformFlatmap(layout, toPx => positions.map((pos) => toPx([pos.chromstart, pos.chromend])));

var probeGroups = probes =>
	exonGroups(probes.map(([start, end]) => ({start, end})));

function drawProbePositions(ctx, probePosition, annotationLanes, width, layout) {
	var {lanes, perLaneHeight, annotationHeight} = annotationLanes,
		startY = annotationHeight,
		endY = (lanes.length || 1) * perLaneHeight + 1;

	pxTransformEach(layout, (toPx, [start, end]) => {
		ctx.beginPath();
		var positions = probePosition
			.map((p, i) => [p, i])
			.filter(([{chromstart, chromend}]) =>
				chromstart <= end && start <= chromend);
		positions.forEach(([{chromstart, chromend}, i]) => {
			var startX = width / probePosition.length * (i + 0.5),
				middle = (chromstart + chromend) / 2,
				[endX] = toPx([middle, middle]);
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
		});
		ctx.lineWidth = 0.5;
		ctx.strokeStyle = 'rgb(0, 0, 0)';
		ctx.stroke();
	});
}

var probeOverlap = (start, end) => ([s, e]) => s < end && start < e;

var bandColors = [
	"#aec7e8", // light blue
	"#555555",
//	"#dbdb8d", // light mustard
	"#ff9896"  // light salmon
];

// highlight clusters
function drawProbePositions1(ctx, probePosition, annotationLanes, width, layout) {
	var {lanes, perLaneHeight, annotationHeight} = annotationLanes,
		screenProbes = probeLayout(layout, probePosition),
		gaps = intronRegions(probeGroups(screenProbes)),
		largest = _.first(gaps.sort(([s0, e0], [s1, e1]) => (e1 - s1) - (e0 - s0)), 4)
			.sort(([x], [y]) => x - y),
		mapping = _.times(largest.length + 1, i => {
			var start = _.getIn(largest, [i - 1, 0], -Infinity),
				end = _.getIn(largest, [i, 1], Infinity),
				pxRegionI = _.filterIndices(screenProbes, probeOverlap(start, end)),
				minI = _.min(pxRegionI, i => screenProbes[i][0]),
				maxI = _.max(pxRegionI, i => screenProbes[i][1]);

			return [[_.min(pxRegionI), _.max(pxRegionI)],
			        [screenProbes[minI][0], screenProbes[maxI][1]]];
		}),
		probeY = annotationHeight,
		geneY = (lanes.length || 1) * perLaneHeight + 1,
		midY = Math.round((probeY + geneY) / 2);

	mapping.forEach(([[iStart, iEnd], [pxStart, pxEnd]], i) => {
		ctx.fillStyle = bandColors[i % bandColors.length];
		ctx.beginPath();
		ctx.moveTo(width / probePosition.length * iStart, probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), midY);
		ctx.lineTo(width / probePosition.length * iStart, midY);
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(pxStart, geneY);
		ctx.lineTo(pxEnd + 1, geneY);
		ctx.lineTo(pxEnd + 1, midY);
		ctx.lineTo(pxStart, midY);
		ctx.fill();
	});
}

// highlight clusters & add tick marks for probes
function drawProbePositions2(ctx, probePosition, annotationLanes, width, layout) {
	var {lanes, perLaneHeight, annotationHeight} = annotationLanes,
		screenProbes = probeLayout(layout, probePosition),
		gaps = intronRegions(probeGroups(screenProbes)),
		largest = _.first(gaps.sort(([s0, e0], [s1, e1]) => (e1 - s1) - (e0 - s0)), 4)
			.sort(([x], [y]) => x - y),
		mapping = _.times(largest.length + 1, i => {
			var start = _.getIn(largest, [i - 1, 0], -Infinity),
				end = _.getIn(largest, [i, 1], Infinity),
				pxRegionI = _.filterIndices(screenProbes, probeOverlap(start, end)),
				minI = _.min(pxRegionI, i => screenProbes[i][0]),
				maxI = _.max(pxRegionI, i => screenProbes[i][1]);

			return [[_.min(pxRegionI), _.max(pxRegionI)],
			        [screenProbes[minI][0], screenProbes[maxI][1]], pxRegionI];
		}),
		probeHeight = 3,
		probeY = annotationHeight,
		geneY = (lanes.length || 1) * perLaneHeight + 1,
		midY = Math.round((probeY + geneY) / 2);

	mapping.forEach(([[iStart, iEnd], [pxStart, pxEnd], pxRegionI], i) => {
		ctx.fillStyle = bandColors[i % bandColors.length];
		ctx.beginPath();
		ctx.moveTo(width / probePosition.length * iStart, probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), midY);
		ctx.lineTo(width / probePosition.length * iStart, midY);
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(pxStart, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, midY);
		ctx.lineTo(pxStart, midY);
		ctx.fill();

		ctx.beginPath();
		ctx.fillStyle = bandColors[i % bandColors.length];

		pxRegionI.forEach(i => {
			var [pxStart, pxEnd] = screenProbes[i];
			ctx.moveTo(pxStart, geneY);
			ctx.lineTo(pxEnd + 1, geneY);
			ctx.lineTo(pxEnd + 1, geneY + probeHeight);
			ctx.lineTo(pxStart, geneY + probeHeight);
			ctx.fill();
		});
	});
}

// draw lines connecting groups
function drawProbePositions3(ctx, probePosition, annotationLanes, width, layout) {
	var {lanes, perLaneHeight, annotationHeight} = annotationLanes,
		screenProbes = probeLayout(layout, probePosition),
		gaps = intronRegions(probeGroups(screenProbes)),
		largest = _.first(gaps.sort(([s0, e0], [s1, e1]) => (e1 - s1) - (e0 - s0)), 4)
			.sort(([x], [y]) => x - y),
		mapping = _.times(largest.length + 1, i => {
			var start = _.getIn(largest, [i - 1, 0], -Infinity),
				end = _.getIn(largest, [i, 1], Infinity),
				pxRegionI = _.filterIndices(screenProbes, probeOverlap(start, end)),
				minI = _.min(pxRegionI, i => screenProbes[i][0]),
				maxI = _.max(pxRegionI, i => screenProbes[i][1]);

			return [[_.min(pxRegionI), _.max(pxRegionI)],
			        [screenProbes[minI][0], screenProbes[maxI][1]], pxRegionI];
		}),
		probeHeight = 2,
		bandHeight = 2,
		probeY = annotationHeight,
		geneY = (lanes.length || 1) * perLaneHeight + 1;
//		midY = Math.round((probeY + geneY) / 2);

	mapping.forEach(([[iStart, iEnd], [pxStart, pxEnd], pxRegionI], i) => {
		ctx.fillStyle = bandColors[i % bandColors.length];
		ctx.beginPath();
		ctx.moveTo(width / probePosition.length * iStart, probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY - bandHeight);
		ctx.lineTo(width / probePosition.length * iStart, probeY - bandHeight);
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(pxStart, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight + bandHeight);
		ctx.lineTo(pxStart, geneY + probeHeight + bandHeight);
		ctx.fill();

		ctx.beginPath();
		ctx.fillStyle = bandColors[i % bandColors.length];

		pxRegionI.forEach(i => {
			var [pxStart, pxEnd] = screenProbes[i];
			ctx.moveTo(pxStart, geneY);
			ctx.lineTo(pxEnd + 1, geneY);
			ctx.lineTo(pxEnd + 1, geneY + probeHeight);
			ctx.lineTo(pxStart, geneY + probeHeight);
			ctx.fill();
		});

		var midProbe = width / probePosition.length * (iStart + iEnd + 1) / 2,
			midGene = (pxStart + pxEnd) / 2;
		ctx.beginPath();
		ctx.moveTo(midProbe, probeY - bandHeight);
		ctx.lineTo(midGene, geneY + probeHeight + bandHeight);
		ctx.strokeStyle = bandColors[i % bandColors.length];
		ctx.lineWidth = 1.5;
		ctx.stroke();
	});
}

// draw lines connecting groups & add subcolumn markers
function drawProbePositions4(ctx, probePosition, annotationLanes, width, layout) {
	var {lanes, perLaneHeight, annotationHeight} = annotationLanes,
		screenProbes = probeLayout(layout, probePosition),
		gaps = intronRegions(probeGroups(screenProbes)),
		largest = _.first(gaps.sort(([s0, e0], [s1, e1]) => (e1 - s1) - (e0 - s0)), 4)
			.sort(([x], [y]) => x - y),
		mapping = _.times(largest.length + 1, i => {
			var start = _.getIn(largest, [i - 1, 0], -Infinity),
				end = _.getIn(largest, [i, 1], Infinity),
				pxRegionI = _.filterIndices(screenProbes, probeOverlap(start, end)),
				minI = _.min(pxRegionI, i => screenProbes[i][0]),
				maxI = _.max(pxRegionI, i => screenProbes[i][1]);

			return [[_.min(pxRegionI), _.max(pxRegionI)],
			        [screenProbes[minI][0], screenProbes[maxI][1]], pxRegionI];
		}),
		probeHeight = 2,
		bandHeight = 2,
		probeY = annotationHeight,
		geneY = (lanes.length || 1) * perLaneHeight + 1;

	mapping.forEach(([[iStart, iEnd], [pxStart, pxEnd], pxRegionI], i) => {
		ctx.fillStyle = bandColors[i % bandColors.length];
		ctx.beginPath();
		ctx.moveTo(width / probePosition.length * iStart, probeY - bandHeight - probeHeight);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY - bandHeight - probeHeight);
		ctx.lineTo(width / probePosition.length * (iEnd + 1), probeY - bandHeight);
		ctx.lineTo(width / probePosition.length * iStart, probeY - bandHeight);
		ctx.fill();

		ctx.beginPath();
		ctx.moveTo(pxStart, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight + bandHeight);
		ctx.lineTo(pxStart, geneY + probeHeight + bandHeight);
		ctx.fill();

		ctx.beginPath();
		ctx.fillStyle = bandColors[i % bandColors.length];

		pxRegionI.forEach(i => {
			var [pxStart, pxEnd] = screenProbes[i];
			ctx.moveTo(pxStart, geneY);
			ctx.lineTo(pxEnd + 1, geneY);
			ctx.lineTo(pxEnd + 1, geneY + probeHeight);
			ctx.lineTo(pxStart, geneY + probeHeight);
			ctx.fill();

			ctx.beginPath();
			ctx.moveTo(width / probePosition.length * i + 1, probeY - bandHeight);
			ctx.lineTo(width / probePosition.length * (i + 1) - 1, probeY - bandHeight);
			ctx.lineTo(width / probePosition.length * (i + 1) - 1, probeY);
			ctx.lineTo(width / probePosition.length * i + 1, probeY);
			ctx.fill();
		});

		var midProbe = width / probePosition.length * (iStart + iEnd + 1) / 2,
			midGene = (pxStart + pxEnd) / 2;
		ctx.beginPath();
		ctx.moveTo(midProbe, probeY - probeHeight - bandHeight);
		ctx.lineTo(midGene, geneY + probeHeight + bandHeight);
		ctx.strokeStyle = bandColors[i % bandColors.length];
		ctx.lineWidth = 1.5;
		ctx.stroke();
	});

}
class RefGeneAnnotation extends React.Component {
	componentWillMount() {
		var events = rxEvents(this, 'mouseout', 'mousemove', 'mouseover');

		// Compute tooltip events from mouse events.
		this.ttevents = events.mouseover
			.filter(ev => util.hasClass(ev.currentTarget, 'Tooltip-target'))
			.flatMap(() => {
				return events.mousemove
					.takeUntil(events.mouseout)
					.map(ev => ({
						data: this.tooltip(ev),
						open: true
					})) // look up current data
					.concat(Rx.Observable.of({open: false}));
			}).subscribe(this.props.tooltip);
	}

	componentWillUnmount() {
		this.ttevents.unsubscribe();
	}

	componentDidMount() {
		var {width, height} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, height);
		this.draw(this.props);
	}

	shouldComponentUpdate() {
		return false;
	}

	componentWillReceiveProps(newProps) {
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	}

	computeAnnotationLanes = ({position, refGene, height}, single) => {
		var newAnnotationLanes;

		if (position && refGene) {
			var lanes = [],
				[start, end] = position;

			//only keep genes with in the current view
			refGene = _.values(refGene).filter((val) => {
				return ((val.txStart <= end) && (val.txEnd >= start));
			});

			//multip lane no-overlapping genes
			refGene.forEach( val => {
				var added = lanes.some(lane => {
					if (lane.every( gene => !((val.txStart <= gene.txEnd) && (val.txEnd >= val.txStart)))) {
						return lane.push(val);
					}
				});
				if (!added) { // add a new lane
					if (!single || lanes.length === 0) {
						lanes.push([val]);
					} else {
						lanes[0].push(val);
					}
				}
			});
			var perLaneHeight = _.min([height / (lanes.length || 1), 12]),
				laneOffset = 0;// (height - perLaneHeight * lanes.length) / 2;

			newAnnotationLanes = {
				arrows: !(refGene.length > 1 && single),
				lanes: lanes,
				perLaneHeight: perLaneHeight,
				laneOffset: laneOffset,
				annotationHeight: height
			};
		} else {
			newAnnotationLanes = {
				lanes: undefined,
				perLaneHeight: undefined,
				laneOffset: undefined,
				annotationHeight: height
			};
		}
		// cache for tooltip
		this.annotationLanes = newAnnotationLanes;
	};

	draw = (props) => {
		var {width, layout, mode, column: {fieldType}, probePosition} = props;
		this.computeAnnotationLanes(props, fieldType === 'geneProbes');
		var {lanes, perLaneHeight, arrows, laneOffset, annotationHeight} = this.annotationLanes;

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

		if ( _.isEmpty(layout.chrom)) {
			return;
		}

		//drawing start here, one lane at a time
		lanes.forEach((lane, k) => {
			var annotation = getAnnotation(k, perLaneHeight, laneOffset);

			lane.forEach(gene => {
				var intervals = findIntervals(gene),
					indx = index(intervals),
					lineY = laneOffset + perLaneHeight * (k + 0.5);


				//find segments for one gene
				pxTransformEach(layout, (toPx, [start, end]) => {
					var nodes = matches(indx, {start: start, end: end}),
						segments = nodes.map(({i, start, end, inCds}) => {
							var {y, h} = annotation[inCds ? 'cds' : 'utr'],
								[pstart, pend] = toPx([start, end]),
								shade = (mode === "geneExon") ?
									(i % 2 === 1 ? shade1 : shade2) :
									(mode === "coordinate" ? shade3 : shade2);
							return [pstart, pend, shade, y, h];
						}),
						[pGeneStart, pGeneEnd] = toPx([gene.txStart, gene.txEnd]);

					// draw a line across the gene
					ctx.fillStyle = shade2;
					ctx.fillRect(pGeneStart, lineY, pGeneEnd - pGeneStart, 1);

					if (arrows) {
						drawIntroArrows (ctx, pGeneStart, pGeneEnd, lineY, segments, mode === 'coordinate' ? gene.strand : '+');
					}

					// draw each segment
					_.each(segments, ([pstart, pend, shade, y, h]) => {
						ctx.fillStyle = shade;
						ctx.fillRect(pstart, y, (pend - pstart) || 1, h);
					});
				});
			});
		});
		// what about introns?
		if (!_.isEmpty(probePosition)) {
			if (true) {
				drawProbePositions4(ctx, probePosition, this.annotationLanes, width, layout);
			} else if (true) {
				drawProbePositions3(ctx, probePosition, this.annotationLanes, width, layout);
			} else if (true) {
				drawProbePositions2(ctx, probePosition, this.annotationLanes, width, layout);
			} else if (true) {
				drawProbePositions1(ctx, probePosition, this.annotationLanes, width, layout);
			} else {
				drawProbePositions(ctx, probePosition, this.annotationLanes, width, layout);
			}
		}
	};

	tooltip = (ev) => {
		var {layout, column: {assembly}} = this.props;

		if (!layout) { // gene model not loaded
			return;
		}
		var {x, y} = util.eventOffset(ev),
			{perLaneHeight, laneOffset, lanes} = this.annotationLanes,
			rows = [],
			assemblyString = encodeURIComponent(assembly),
			contextPadding = Math.floor((layout.zoom.end - layout.zoom.start) / 4),
			posLayout = `${layout.chromName}:${util.addCommas(layout.zoom.start)}-${util.addCommas(layout.zoom.end)}`,
			posLayoutPadding = `${layout.chromName}:${util.addCommas(layout.zoom.start - contextPadding)}-${util.addCommas(layout.zoom.end + contextPadding)}`,
			posLayoutString = encodeURIComponent(posLayout),
			posLayoutPaddingString = encodeURIComponent(posLayoutPadding),
			GBurlZoom = `http://genome.ucsc.edu/cgi-bin/hgTracks?db=${assemblyString}&highlight=${assemblyString}.${posLayoutString}&position=${posLayoutPaddingString}`;

		if (y > laneOffset && y < laneOffset + lanes.length * perLaneHeight) {
			var posStart = chromPositionFromScreen(layout, x - 0.5),
				posEnd = chromPositionFromScreen(layout, x + 0.5),
				matches = [],
				laneIndex = Math.floor((y - laneOffset) / perLaneHeight); //find which lane by y

			lanes[laneIndex].forEach(gene => {
				if ((posEnd >= gene.txStart) && (posStart <= gene.txEnd)) {
					matches.push(gene);
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
	};

	render() {
		return (
			<canvas
				className='Tooltip-target'
				onMouseMove={this.on.mousemove}
				onMouseOut={this.on.mouseout}
				onMouseOver={this.on.mouseover}
				onClick={this.props.onClick}
				ref='canvas' />
		);
	}
}

//widgets.annotation.add('gene', props => <RefGeneAnnotation {...props}/>);

export default RefGeneAnnotation;
