'use strict';
var React = require('react');
var _ = require('../underscore_ext');

import '../../css/transcript_css/exons.css';

var width = 700;
//this function is to plot exons before cdsStart or after cdsEnd
function smallBox(startsAt, width, multiplyingFactor, strand, label = "") {
	let origin = strand === '-' ? "right" : "left";

	let style = { width: (width * multiplyingFactor) + "px",
					height: "20%",
					top: "40%",
				};
	style[origin] = (startsAt * multiplyingFactor) + "px";

	return ( <div className="exons--row--item"
					style={style}>
					<span style={{bottom: "20px"}}>{label}</span>
				</div>
		);
}

//this function is to plot exons between cdsStart and cdsEnd
function bigBox(startsAt, width, multiplyingFactor, strand, label = "") {
	let origin = strand === '-' ? 'right' : 'left';

	let style = { width: (width * multiplyingFactor) + "px",
					height: "35%",
					top: "32.5%",
				};
	style[origin] = (startsAt * multiplyingFactor) + "px";

	return ( <div className="exons--row--item"
					style={style}>
					<span style={{bottom: "25px"}}>{label}</span>
				</div>
		);
}

function exonShape(data, exonStarts, exonEnds, cdsStart, cdsEnd, multiplyingFactor, strand, origin) {

	let exonWidth = exonEnds - exonStarts;
	let startsAt = exonStarts - origin;
	if(cdsStart > exonEnds)
	{
		return smallBox( startsAt, exonWidth, multiplyingFactor, strand);
	}
	else if(exonStarts < cdsStart && cdsStart < exonEnds)
	{
		let exonWidth1 = cdsStart - exonStarts;
		let exonWidth2 = exonEnds - cdsStart;
		return [smallBox( startsAt, exonWidth1, multiplyingFactor, strand),
			bigBox( (cdsStart - origin), exonWidth2, multiplyingFactor, strand)];
	}
	else if(exonStarts < cdsEnd && cdsEnd < exonEnds)
	{
		let exonWidth1 = cdsEnd - exonStarts;
		let exonWidth2 = exonEnds - cdsEnd;
		return [bigBox( startsAt, exonWidth1, multiplyingFactor, strand),
			smallBox( (cdsEnd - origin), exonWidth2, multiplyingFactor, strand)];
	}
	else if(cdsEnd < exonStarts)
	{
		return smallBox( startsAt, exonWidth, multiplyingFactor, strand);
	}
	else
	{
		return bigBox( startsAt, exonWidth, multiplyingFactor, strand);
	}
}

var Exons = React.createClass({

	row(data, multiplyingFactor, origin) {

		return data.map((d, index) => {

			let style = { width: ((d.txEnd - d.txStart) * multiplyingFactor) + "px" };
			style = d.strand === '-' ? _.conj(style, ['right', ((d.txStart - origin) * multiplyingFactor) + "px"])
									 : _.conj(style, ['left', ((d.txStart - origin) * multiplyingFactor) + "px"]);

			return ( <div className="exons--row" id={index}>
						<div className="exons--row--axis"
							 style={style}/>
					{
						_.flatten(_.mmap(d.exonStarts, d.exonEnds, (exonStarts, exonEnds) => {
							return exonShape(data, exonStarts, exonEnds, d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand, origin);
						}))
					}
					</div>
					);
		});
	},

	render() {
		let data = this.props.data ? this.props.data : null;
		let origin = Math.min.apply(Math, _.pluck(data, 'txStart'));
		//multiplying factor used to calculate position and width
		let multiplyingFactor = width / (Math.max.apply(Math, _.pluck(data, 'txEnd')) - origin);

		let rows = this.row(data, multiplyingFactor, origin);

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
