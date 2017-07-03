'use strict';
var React = require('react');
var _ = require('../underscore_ext');

import '../../css/transcript_css/exons.css';

var width = 700;
//this function is to plot exons before cdsStart or after cdsEnd
function smallBox(left, width, multiplyingFactor, strand, label = "") {
	let origin = strand === '-' ? "right" : "left";

	let style = { width: (width * multiplyingFactor) + "px",
					height: "20%",
					top: "40%",
				};
	style[origin] = (left * multiplyingFactor) + "px";

	return ( <div className="exons--row--item"
					style={style}>
					<span style={{bottom: "20px"}}>{label}</span>
				</div>
		);
}

//this function is to plot exons between cdsStart and cdsEnd
function bigBox(left, width, multiplyingFactor, strand, label = "") {
	let origin = strand === '-' ? 'right' : 'left';

	let style = { width: (width * multiplyingFactor) + "px",
					height: "35%",
					top: "32.5%",
				};
	style[origin] = (left * multiplyingFactor) + "px";

	return ( <div className="exons--row--item"
					style={style}>
					<span style={{bottom: "25px"}}>{label}</span>
				</div>
		);
}

function exonShape(data, exonStarts, exonEnds, cdsStart, cdsEnd, multiplyingFactor, strand) {
	if(cdsStart > exonEnds)
	{
		return smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, strand);
	}
	else if(exonStarts < cdsStart && cdsStart < exonEnds)
	{
		return [smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (cdsStart - exonStarts), multiplyingFactor, strand), bigBox( (cdsStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - cdsStart), multiplyingFactor, strand)];
	}
	else if(exonStarts < cdsEnd && cdsEnd < exonEnds)
	{
		return [bigBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (cdsEnd - exonStarts), multiplyingFactor, strand), smallBox( (cdsEnd - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - cdsEnd), multiplyingFactor, strand)];
	}
	else if(cdsEnd < exonStarts)
	{
		return smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, strand);
	}
	else
	{
		return bigBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, strand);
	}
}

var Exons = React.createClass({

	row(data, multiplyingFactor) {

		return data.map((d, index) => {

			let style = { width: ((d.txEnd - d.txStart) * multiplyingFactor) + "px" };
			style = d.strand === '-' ? _.conj(style, ['right', ((d.txStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))) * multiplyingFactor) + "px"])
									 : _.conj(style, ['left', ((d.txStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))) * multiplyingFactor) + "px"]);

			return ( <div className="exons--row" id={index}>
						<div className="exons--row--axis"
							 style={style}/>
					{
						_.flatten(_.mmap(d.exonStarts, d.exonEnds, (exonStarts, exonEnds) => {
							return exonShape(data, exonStarts, exonEnds, d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand);
						}))
					}
					</div>
					);
		});
	},

	render() {
		let data = this.props.data ? this.props.data : null;

		//multiplying factor used to calculate position and width
		let multiplyingFactor = width / (Math.max.apply(Math, _.pluck(data, 'txEnd')) - Math.min.apply(Math, _.pluck(data, 'txStart')));

		let rows = this.row(_.sortBy(data, 'exonCount').reverse(), multiplyingFactor);

		return (
				<div className="exons">
					{rows}
				</div>
			);
	}
});

module.exports = {
	Exons,
	smallBox,
	bigBox
};
