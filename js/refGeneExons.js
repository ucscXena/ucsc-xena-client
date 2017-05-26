'use strict';

var _ = require('./underscore_ext');
var widgets = require('./columnWidgets');
var React = require('react');
var ReactDOM = require('react-dom');
var intervalTree = require('static-interval-tree');
var vgcanvas = require('./vgcanvas');
var layoutPlot = require('./layoutPlot');
var {drawChromScale} = require('./ChromPosition');

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
	font = 10,
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

var RefGeneAnnotation = React.createClass({
	getGeneInfo: function () {
		return {
			name: this.data.name2,
			scaleX: this.scaleX,
			txStart: this.data.txStart,
			txEnd: this.data.txEnd,
			strand: this.data.strand
		};
	},

	draw: function (width, layout, indx, alternateColors) {
		if (!width || !layout || !indx) {
			return;
		}
		var vg = this.vg,
			ctx = vg.context();

		if (vg.width() !== width) {
			vg.width(width);
		}

		vg.box(0, 0, width, refHeight * 2, 'white'); // white background

		// draw a line across to represent the entire horizontal genomic region that will be in display, for promoter and downstream region
		ctx.fillStyle = 'grey';
		ctx.fillRect(0, refHeight * 1.5, width, 1);

		pxTransformEach(layout, (toPx, [start, end]) => {
			var nodes = matches(indx, {start: start, end: end});
			_.each(nodes.sort((a, b)=> (b.start - a.start)), ({i, start, end, inCds}) => {
				var {y, h} = annotation[inCds ? 'cds' : 'utr'];
				var [pstart, pend] = toPx([start, end]);
				ctx.fillStyle = (alternateColors && i % 2 === 1) ? shade1 : shade2;
				ctx.fillRect(pstart, y + refHeight, (pend - pstart) || 1, h);
			});
		});

		// if in genomic mode i.e. (alternateColors === false), draw scale
		if (alternateColors === false) {
			var genomic = false;
			drawChromScale(vg, width, layout, genomic);
		} else { // in exon mode, just write 5' and 3'
			vg.text(0, refHeight - 4, 'black', font, "5'");
			vg.text(width - vg.textWidth(font, "3'"), refHeight - 4, 'black', font, "3'");
		}
	},

	componentDidMount: function () {
		var {width, layout, alternateColors} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, refHeight * 2);
		this.draw(width, layout, this.index, alternateColors);
	},

	render: function () {
		var {width, layout, refGene, alternateColors} = this.props,
			intervals = findIntervals(refGene);

		this.index = index(intervals);
		if (this.vg) {
			this.draw(width, layout, this.index, alternateColors);
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
	}
});

widgets.annotation.add('gene', props => <RefGeneAnnotation {...props}/>);

module.exports = {
	findIntervals: findIntervals,
	RefGeneAnnotation: RefGeneAnnotation
};
