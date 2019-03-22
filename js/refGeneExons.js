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
	shade2 = '#000005',  //black
	shade3 = '#000080',  //blue
	shade4 = '#FF0000',  //red
	shade5 = '#79CDCD';  //darkslategray5 used on gene's name annotation

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

//Function to write GEN tags according to position
function writeGENnamepositions(ctx, xStart, xEnd, endY, GENname, upPlace, place) {
	var gapSize = 6;     			   //size of letters
	ctx.fillStyle = shade5;           //shade5 darkslategray5
	ctx.font = "8px";

	if(place === "up") {
		if( upPlace === undefined) { ctx.fillText(GENname, xStart + 1, endY - 8); }     //write the name in the start of the GEN
		else {ctx.fillText(GENname, upPlace, endY - 8); }							  //write the name in the middle of the GEN
	}else if(place === "right") {
		ctx.fillText(GENname, xEnd + gapSize, endY + 3);
	}else {
		ctx.fillText(GENname, xStart - (GENname.length * gapSize), endY + 3);
	}
}

function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key)) {
            return false; }
    }
    return true;
}

function checkValidZone(xStart, xEnd, yStart, segments, GENsize, ctx) {
	ctx.imageSmoothingEnabled = true;
	var gapsize = 6;
	var midGEN = (xStart + xEnd) / 2;

	var upProve = ctx.getImageData( xStart, yStart - 12, GENsize.length * gapsize, gapsize),					// get an rectangle of the size of the GEN name located up the line of the Gene
		midProve = ctx.getImageData( midGEN, yStart - 12, GENsize.length * gapsize, gapsize),					//get an rectangle of the size of the GEN name located in the middle of the line of the Gene
		rightProve = ctx.getImageData(xStart + 4, yStart + 2, GENsize.length * gapsize, gapsize),				//get an rectangle of the size of the GEN name located right the line of the Gene
		leftProve = ctx.getImageData(xStart - GENsize.length * gapsize, yStart + 2, GENsize.length * gapsize, gapsize); // get an rectangle of the size of the GEN name located left the line of the Gene

	var replacer = function(k, v) { if (v === undefined || v === 255 || v === 0) { return; } return v; };	//create a replacer to filter pixels
	var upData = JSON.stringify(upProve, replacer), 															// get JSON of ctx
		midData = JSON.stringify(midProve, replacer), 															// get JSON of ctx
		rightData = JSON.stringify(rightProve, replacer), 														// get JSON of ctx
		leftData = JSON.stringify(leftProve, replacer);															// get JSON of ctx

	if(isEmpty(JSON.parse(upData).data)) {
		return { confirm: true, place: "up", upPlace: undefined };
	}else if(isEmpty(JSON.parse(midData).data)) {
		return { confirm: true, place: "up", upPlace: parseInt(midGEN) };
	}else if(isEmpty(JSON.parse(rightData).data)) {
		return { confirm: true, place: "right", upPlace: undefined };
	}else if(isEmpty(JSON.parse(leftData).data)) {
		return { confirm: true, place: "left", upPlace: undefined };
	}

	return { confirm: false, place: "", upPlace: undefined };
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

		var genes = 0;
		//drawing start here, one lane at a time
		lanes.forEach((lane, k) => {
			var annotation = getAnnotation(k, perLaneHeight, laneOffset);
			genes = (genes > lane.length ? genes : lane.length);
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
									(mode === "coordinate" ? (gene.strand === '-' ? shade3 : shade4) : shade2);
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

			//here starts the tags' writting
			if(genes < 40) {
				lane.forEach(gene => {
				var intervals = findIntervals(gene),
				indx = index(intervals),
				lineY = laneOffset + perLaneHeight * (k + 0.5);
				pxTransformEach(layout, (toPx, [start, end]) => {
					var nodes = matches(indx, {start: start, end: end}),
						segments = nodes.map(({start, end, inCds}) => {
					var {y, h} = annotation[inCds ? 'cds' : 'utr'],
						[pstart, pend] = toPx([start, end]);
							return [pstart, pend, y, h];
					}),
						[pGeneStart, pGeneEnd] = toPx([gene.txStart, gene.txEnd]);
						let { confirm, place, upPlace } = checkValidZone(pGeneStart, pGeneEnd, lineY, segments, gene.name2, ctx);         //here checks if is possible to write the GEN names
						if(confirm) {
							writeGENnamepositions(ctx, pGeneStart, pGeneEnd, lineY, gene.name2, upPlace, place);			//here writes the GEN names
						}
					});
				});
			}
		});
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
