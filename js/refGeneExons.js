'use strict';

var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');
var React = require('react');
var ReactDOM = require('react-dom');
var Tooltip = require('react-bootstrap/lib/Tooltip');
var OverlayTrigger = require('react-bootstrap/lib/OverlayTrigger');
var util = require('./util');
var intervalTree = require('static-interval-tree');
var vgcanvas = require('./vgcanvas');
var layoutPlot = require('./layoutPlot');
var {drawChromScale} = require('./ChromPosition');
var {chromPositionFromScreen} = require('./exonLayout');

var {matches, index} = intervalTree;
var {pxTransformEach} = layoutPlot;


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
	refHeight = 12,
	annotation = {
		utr: {
			y: refHeight / 4,
			h: refHeight / 2
		},
		cds: {
			y: 0,
			h: refHeight
		}
	};

var helpText =  'Drag zoom. Shift-click zoom out.';

var RefGeneAnnotation = React.createClass({
	getInitialState: function () {
		return {
			helpText: [helpText]
		};
	},

	draw: function (width, layout, indx, mode, refGene) {
		if (!width || !layout || !indx) {
			return;
		}
		var vg = this.vg,
			ctx = vg.context();

		if (vg.width() !== width) {
			vg.width(width);
		}

		var allSegments = [];

		pxTransformEach(layout, (toPx, [start, end]) => {
			var nodes = matches(indx, {start: start, end: end});
			_.each(nodes.sort((a, b)=> (b.start - a.start)), ({i, start, end, inCds}) => {
				var {y, h} = annotation[inCds ? 'cds' : 'utr'];
				var [pstart, pend] = toPx([start, end]);
				var	shade = (mode === "geneExon" && i % 2 === 1) ? shade1 : shade2;
				allSegments.push([pstart, pend, shade, y, h]);
			});
		});

		// draw a line across the gene
		ctx.fillStyle = shade2;
		if (_.isEmpty(allSegments)) {  // check if inside a gene, if so draw a line across
			_.mapObject(refGene,  (val) => {
				var [start, end] = layout.chrom[0];
				if ((val.txStart <= end) && (val.txEnd >= start)) {
					ctx.fillRect(0, refHeight * 1.5, width, 1);
				}
			});
		} else {
			var pGeneStart = _.min(allSegments.map(s => s[0])),
				pGeneEnd = _.max(allSegments.map(s => s[1]));
			ctx.fillRect(pGeneStart, refHeight * 1.5, pGeneEnd - pGeneStart, 1);
		}

		// draw each segments
		_.each(allSegments, s => {
			var [pstart, pend, shade, y, h] = s;
			ctx.fillStyle = shade;
			ctx.fillRect(pstart, y + refHeight, (pend - pstart) || 1, h);
		});

		// draw scale, and 5' 3'
		drawChromScale(vg, width, layout, mode);
	},

	onMouseMove: function(ev) {
		var {layout, refGene} = this.props,
			{x} = util.eventOffset(ev),
			pos = Math.floor(chromPositionFromScreen(layout, x)),
			matches = [];

		_.mapObject(refGene,  (val, key) => {
			if ((pos >= val.txStart) && (pos <= val.txEnd)) {
				matches.push(key);
			}
		});

		this.setState({ helpText: [matches.join(' '), helpText]});
	},

	componentDidMount: function () {
		var {width, layout, refGene, mode} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, refHeight * 2);
		this.vg.box(0, 0, width, refHeight * 2, 'white'); // white background
		_.values(refGene).map( val => {
			var intervals = findIntervals(val);
			this.index = index(intervals);
			if (this.vg) {
				this.draw(width, layout, this.index, mode, refGene);
			}
		});
	},

	render: function () {
		var {width, layout, refGene, mode} = this.props;

		if (this.vg) {
			this.vg.box(0, 0, width, refHeight * 2, 'white'); // white background
			_.values(refGene).map( val => {
				var intervals = findIntervals(val);
				this.index = index(intervals);
				if (this.vg) {
					this.draw(width, layout, this.index, mode, refGene);
				}
			});
		}

		var tooltip = (
			<Tooltip>
				{this.state.helpText.map(text => (<div>{text}</div>))}
			</Tooltip>
		);

		return (
			<OverlayTrigger trigger={['hover']} placement='top' overlay={tooltip}>
				<canvas
					className='Tooltip-target'
					onMouseMove={this.onMouseMove}
					onMouseOut={this.props.onMouseOut}
					onMouseOver={this.props.onMouseOver}
					onClick={this.props.onClick}
					onDblClick={this.props.onDblClick}
					ref='canvas' />
			</OverlayTrigger>
		);
	}
});

widgets.annotation.add('gene', props => <RefGeneAnnotation {...props}/>);

module.exports = {
	findIntervals: findIntervals,
	RefGeneAnnotation: RefGeneAnnotation
};
