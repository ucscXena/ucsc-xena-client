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
var {chromPositionFromScreen} = require('./exonLayout');
var {isoluminant} = require('./colorScales');
import PureComponent from './PureComponent';
var styles = require('./refGeneExons.module.css');

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

var shade1 = '#cccccc',  //light grey
	shade2 = '#000000',  //black
	shade3 = '#000080',  //blue
	shade4 = '#FF0000';  //red

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

	ctx.strokeStyle = shade2;
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

function drawProbePositions(ctx, probePosition, height, positionHeight, width, layout) {
	var count = probePosition.length,
		screenProbes = probeLayout(layout, probePosition),
		probeHeight = 2,
		probeY = height,
		geneY = height - positionHeight,
// conventional rainbow scale
//		colors = _.times(count, i => `hsl(${Math.round(i * 240 / count)}, 100%, 50%)`);
		colors = _.times(count, isoluminant(0, count));


	pxTransformEach(layout, (toPx, [start, end]) => {
		ctx.lineWidth = 0.5;
		var positions = probePosition
			.map((p, i) => [p, i])
			.filter(([{chromstart, chromend}]) =>
				chromstart <= end && start <= chromend);
		positions.forEach(([{chromstart, chromend}, i]) => {
			var startX = width / probePosition.length * (i + 0.5),
				middle = (chromstart + chromend) / 2,
				[endX] = toPx([middle, middle]);
			ctx.beginPath();
			ctx.moveTo(startX, probeY - probeHeight);
			ctx.lineTo(endX, geneY + probeHeight);
			ctx.strokeStyle = colors[i];
			ctx.stroke();
		});
	});

	screenProbes.forEach(([pxStart, pxEnd], i) => {
		ctx.beginPath();
		ctx.moveTo(pxStart, geneY);
		ctx.lineTo(pxEnd + 1, geneY);
		ctx.lineTo(pxEnd + 1, geneY + probeHeight);
		ctx.lineTo(pxStart, geneY + probeHeight);
		ctx.fillStyle = colors[i];
		ctx.fill();
	});

	_.times(screenProbes.length, i => {
		ctx.beginPath();
		ctx.moveTo(width / probePosition.length * i + 1, probeY - probeHeight);
		ctx.lineTo(width / probePosition.length * (i + 1) - 1, probeY - probeHeight);
		ctx.lineTo(width / probePosition.length * (i + 1) - 1, probeY);
		ctx.lineTo(width / probePosition.length * i + 1, probeY);
		ctx.fillStyle = colors[i];
		ctx.fill();
	});
}

// Function to write GENE according to position
function writeGENnamepositions(ctx, xStart, xEnd, y, perLaneHeight, start, strand, label, placement) {
	var lettersize = ctx.measureText('M').width,
		labelSize = ctx.measureText(label).width,
		pad = 2;

	ctx.fillStyle =
		strand === "+" ? "red" :
		strand === "-" ? "blue" : "black";
	ctx.font = "8px";

	// By default the vertical text-alignment (baseline) is set to "alphabetic" which uses the general bottom of the text for the y coordinate.
	switch(placement) {
		case "up":
			ctx.fillText(label, start, y - perLaneHeight / 2 - pad);
			break;
		case "down":
			ctx.fillText(label, start, y + perLaneHeight / 2 + lettersize + pad);
			break;
		case "right" :
			ctx.fillText(label, xEnd + pad, y + lettersize / 2 - 1);
			break;
		case "left" :
			ctx.fillText(label, xStart - labelSize - pad, y + lettersize / 2 - 1);
			break;
	}
}

function checkValidZone(xStart, xEnd, y, perLaneHeight, height, label, columnWidth, ctx) {
	var labelSize = ctx.measureText(label).width,
		pad = 2,

		boxStart = _.min([xStart, xEnd - labelSize]),
		boxEnd = _.max([xEnd, xStart + labelSize]),
		upBox = y - perLaneHeight > 0 ? ctx.getImageData( boxStart, y - perLaneHeight, boxEnd - boxStart + 1, 1) : undefined,
		downBox = y + perLaneHeight < height ? ctx.getImageData( boxStart, y + perLaneHeight, boxEnd - boxStart + 1, 1) : undefined,

		//get the middle line the size of the GENE name located right of the Gene
		rightBox = xEnd + pad >= columnWidth ? undefined : ctx.getImageData(xEnd, y, labelSize + pad, 1),
		// get the middle line the size of the GENE name located left of the Gene
		leftBox = xStart <= pad ? undefined : ctx.getImageData(xStart - labelSize - pad, y, labelSize + pad, 1);

	var findMaxGap = data => {
		var maxGap = 0,
			maxStart = 0,
			maxEnd = 0,
			start = -1,
			end = 0;

		for (var i = 0; i < data.length; i = i + 4) {
			if (data.slice(i, i + 3).reduce((a, b) => a + b) === 255 * 3 || data[i + 3] === 0) { // white pixel
				if (start === -1) { // restart
					start = i;
				}
				end = i;
			} else { // color pixel
				if ((end - start) > maxGap) {
					maxGap = end - start;
					maxStart = start;
					maxEnd = end;
				}
				start = -1;
				end = -1;
			}
		}

		if ((end - start) > maxGap) {
			maxStart = start;
			maxEnd = end;
		}

		return [boxStart + maxStart / 4, boxStart + maxEnd / 4];
	};

	var allWhitePixel = data => {
		for (var i = 0; i < data.length; i = i + 4) {
			if (data.slice(i, i + 3).reduce((a, b) => a + b) !== 255 * 3 && data[i + 3] !== 0) { // white pixel
				return false;
			}
		}
		return true;
	};

	var [upStart, upEnd] = upBox ? findMaxGap(upBox.data) : [undefined, undefined];
	var [downStart, downEnd] = downBox ? findMaxGap(downBox.data) : [undefined, undefined];
	if (labelSize < (upEnd - upStart + 2)) {
		return {confirm: true, placement: "up", start: (upEnd + upStart - labelSize) / 2};
	} else if (labelSize < (downEnd - downStart + 2)) {
		return {confirm: true, placement: "down", start: (downEnd + downStart - labelSize) / 2};
	} else if (rightBox && allWhitePixel(rightBox.data)) {
		return {confirm: true, placement: "right"};
	} else if (leftBox && allWhitePixel(leftBox.data)) {
		return {confirm: true, placement: "left" };
	} else {
		return {confirm: false};
	}
}

class RefGeneDrawing extends React.Component {
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

	// single: force a single lane, i.e. 'dense' mode. Unused.
	computeAnnotationLanes = ({position, refGene, height, positionHeight = 0}, single) => {
		var bottomPad = positionHeight ? 1 : 0,
			annotationHeight = height - positionHeight - bottomPad,
			newAnnotationLanes;

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
			var perLaneHeight = _.min([annotationHeight / (lanes.length || 1), 12]),
				// if no position annotation, vertically center refgene.
				// Otherwise, push it against the position annotation.
				centering = positionHeight ? 1 : 2,
				laneOffset = (annotationHeight - perLaneHeight * lanes.length) / centering;

			newAnnotationLanes = {
				arrows: !(refGene.length > 1 && single),
				lanes: lanes,
				perLaneHeight: perLaneHeight,
				laneOffset: laneOffset,
				annotationHeight
			};
		} else {
			newAnnotationLanes = {
				lanes: undefined,
				perLaneHeight: undefined,
				laneOffset: undefined,
				annotationHeight
			};
		}
		// cache for tooltip
		this.annotationLanes = newAnnotationLanes;
	};

	draw = (props) => {
		var {width, layout, height, positionHeight, mode, probePosition} = props;
		this.computeAnnotationLanes(props, false);
		var {lanes, perLaneHeight, arrows, laneOffset} = this.annotationLanes;

		// white background
		this.vg.box(0, 0, width, height, 'white');

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

		var genePositions = [];
		//drawing start here, one lane at a time
		lanes.forEach((lane, k) => {
			var annotation = getAnnotation(k, perLaneHeight, laneOffset),
				lineY = laneOffset + perLaneHeight * (k + 0.5);

			lane.forEach(gene => {
				var intervals = findIntervals(gene),
					indx = index(intervals),
					pGeneStart, pGeneEnd,
					transformedLayouts = [];

				//find segments for one gene
				pxTransformEach(layout, (toPx, [start, end]) => {
					var pLayoutStart, pLayoutEnd,
						nodes = matches(indx, {start: start, end: end}),
						segments = nodes.map(({i, start, end, inCds}) => {
							var {y, h} = annotation[inCds ? 'cds' : 'utr'],
								[pstart, pend] = toPx([start, end]),
								shade = (mode === "geneExon") ?
									(i % 2 === 1 ? shade1 : shade2) :
									(mode === "coordinate" ? (gene.strand === '-' ? shade3 : shade4) : shade2);
							return [pstart, pend, shade, y, h];
						});

					[pLayoutStart, pLayoutEnd] = toPx([gene.txStart, gene.txEnd]);

					// draw a line across the gene
					ctx.fillStyle = shade2;
					ctx.fillRect(pLayoutStart, lineY, pLayoutEnd - pLayoutStart, 1);

					if (arrows) {
						drawIntroArrows (ctx, pLayoutStart, pLayoutEnd, lineY, segments, mode === 'coordinate' ? gene.strand : '+');
					}

					// draw each segment
					_.each(segments, ([pstart, pend, shade, y, h]) => {
						ctx.fillStyle = shade;
						ctx.fillRect(pstart, y, (pend - pstart) || 1, h);
					});

					transformedLayouts.push([pLayoutStart, pLayoutEnd]);
				});

				transformedLayouts.sort((x, y) => x[0] < y[0]);
				pGeneStart = transformedLayouts[0][0];
				pGeneEnd = transformedLayouts[transformedLayouts.length - 1][1];
				genePositions.push({
						pGeneStart: pGeneStart,
						pGeneEnd: pGeneEnd,
						lineY: lineY,
						label: gene.name2,
						strand: mode === 'coordinate' ? gene.strand : undefined
					});
			});
		});

		//draw gene labels when relatively zoomed-in
		var labelGene =  lanes[0].length < width / 10 ? true : false;
		// gene name drawing
		if (labelGene) {
			// sort to draw bigger genes' labels first
			genePositions.sort((x, y) => {
				return (y.pGeneEnd - y.pGeneStart) - (x.pGeneEnd - x.pGeneStart);
			});
			var count = 0;
			genePositions.forEach(x => {
				// checks if is possible to write the gene name
				let {confirm, placement, start} =
					checkValidZone(x.pGeneStart, x.pGeneEnd, x.lineY, perLaneHeight, perLaneHeight * lanes.length, x.label, width, ctx);

				// write gene name
				if (confirm) {
					count ++;
					if ((x.pGeneEnd - x.pGeneStart) > 2 || count <= 10) { // draw relatively bigger genes' labels: at least 3 pixel wide or top 10 largest genes
						writeGENnamepositions(ctx, x.pGeneStart, x.pGeneEnd, x.lineY, perLaneHeight, start, x.strand, x.label, placement);
					}
				}
			});
		}

		// what about introns?
		if (!_.isEmpty(probePosition)) {
			drawProbePositions(ctx, probePosition, height, positionHeight, width, layout);
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

class RefGeneHighlight extends PureComponent {
	render () {
		var {height, position} = this.props,
			style = height ? {width: Math.max(position[1] - position[0], 1), height, left: position[0]} : {display: 'none'};
		return (
			<div className={styles.highlight}>
				<div className={styles.box} style={style}/>
			</div>);
	}
}

class RefGeneAnnotation extends PureComponent {
	state = {probe: undefined};
	componentWillMount() {
		this.sub = this.props.tooltip.subscribe(ev => {
			if (_.getIn(ev, ['data', 'id']) === this.props.id) {
				this.setState({
					probe: _.getIn(ev, ['data', 'fieldIndex']),
					x: _.getIn(ev, ['data', 'x'])});
			} else if (this.state.probe !== null || this.state.x !== null) {
				this.setState({probe: undefined, x: undefined});
			}
		});
	}
	componentWillUnmount() {
		this.sub.unsubscribe();
	}
	render() {
		var {probePosition, height, positionHeight, layout} = this.props,
			{probe, x} = this.state,
			highlight = probe != null && _.get(probePosition, probe) ? {
					position: probeLayout(layout, [probePosition[probe]])[0],
					height: height - positionHeight
				} : x != null ? {
					position: [x, x + 1],
					height: height - positionHeight
				} : {};
		return (
			<div className={styles.refGene}>
				<RefGeneDrawing {...this.props}/>
				<RefGeneHighlight {...highlight}/>
			</div>);
	}
}

//widgets.annotation.add('gene', props => <RefGeneAnnotation {...props}/>);

export default RefGeneAnnotation;
