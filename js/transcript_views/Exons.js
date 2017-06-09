'use strict';
var React = require('react');
var _ = require('../underscore_ext');

import '../../css/transcript_css/exons.css';

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
						_.mmap(d.exonStarts, d.exonEnds, (exonStarts, exonEnds) => {
							if(d.cdsStart > exonEnds)
							{
								return this.smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, d.strand);
							}
							else if(exonStarts < d.cdsStart && d.cdsStart < exonEnds)
							{
								return (

										this.box((exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (d.cdsStart - exonStarts), (d.cdsStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - d.cdsStart), multiplyingFactor, d.strand)
										// <div>
										// {this.smallBox( _.spy("left-1", (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart'))))), _.spy("width-1", (d.cdsStart - exonStarts)), multiplyingFactor),
										// this.bigBox( _.spy("left-2", (d.cdsStart - (Math.min.apply(Math, _.pluck(data, 'txStart'))))), _.spy("width-2", (exonEnds - d.cdsStart)), multiplyingFactor)}
										// </div>
										);
							}
							else if(exonStarts < d.cdsEnd && d.cdsEnd < exonEnds)
							{
								return (

										this.box((d.cdsEnd - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - d.cdsEnd), (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (d.cdsEnd - exonStarts), multiplyingFactor, d.strand)
										// <div>
										// this.bigBox( _.spy("left-1", (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart'))))), _.spy("width-1", (d.cdsEnd - exonStarts)), multiplyingFactor),
										// this.smallBox( _.spy("left-2", (d.cdsEnd - (Math.min.apply(Math, _.pluck(data, 'txStart'))))), _.spy("width-2", (exonEnds - d.cdsEnd)), multiplyingFactor)
										// </div>
										);
							}
							else if(d.cdsEnd < exonStarts)
							{
								return this.smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, d.strand);
							}
							else
							{
								return this.bigBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts), multiplyingFactor, d.strand);
							}
						})
					}
					</div>
					);
		});
	},

	//this function is to plot exons before cdsStart or after cdsEnd
	smallBox(left, width, multiplyingFactor, strand) {

		let style = { width: (width * multiplyingFactor) + "px",
					  height: "15%",
					  backgroundColor: "#0097a7", //color-1
					  top: "42.5%",
					};

		style = strand === '-' ? _.conj(style, ['right', (left * multiplyingFactor) + "px"]) :
								 _.conj(style, ['left', (left * multiplyingFactor) + "px"]);

		return ( <div className="exons--row--item"
					  style={style}/>
			);
	},

	//this function is to plot exons between cdsStart and cdsEnd
	bigBox(left, width, multiplyingFactor, strand) {

		let style = { width: (width * multiplyingFactor) + "px",
					  height: "30%",
					  backgroundColor: "#26c6da", //color-2
					  top: "35%",
					};

		style = strand === '-' ? _.conj(style, ['right', (left * multiplyingFactor) + "px"]) :
								 _.conj(style, ['left', (left * multiplyingFactor) + "px"]);

		return ( <div className="exons--row--item"
					  style={style}/>
			);
	},

	//this is a mixbag of the two box views for exons having cdsStart/cdsEnd within them
	//I tried calling smallBox and bigBox one after the other (commented in the elseifs)
	//to implement this view, but it didn't work.
	box(left1, width1, left2, width2, multiplyingFactor, strand) {

		let style1 = { width: (width1 * multiplyingFactor) + "px",
			  		   height: "15%",
			  		   backgroundColor: "#0097a7", //color-1
			  		   top: "42.5%",
					 };

		let style2 = { width: (width2 * multiplyingFactor) + "px",
			  		   height: "30%",
			  		   backgroundColor: "#26c6da", //color-2
			  		   top: "35%",
					 };

		style1 = strand === '-' ? _.conj(style1, ['right', (left1 * multiplyingFactor) + "px"]) :
								  _.conj(style1, ['left', (left1 * multiplyingFactor) + "px"]);

		style2 = strand === '-' ? _.conj(style2, ['right', (left2 * multiplyingFactor) + "px"]) :
								  _.conj(style2, ['left', (left2 * multiplyingFactor) + "px"]);

		return (<div>
				<div className="exons--row--item"
					  style={style1}/>
				<div className="exons--row--item"
					  style={style2}/>
				</div>
				);
	},

	render() {
		let data = this.props.data ? this.props.data : null;

		//multiplying factor used to calculate position and width
		let multiplyingFactor = 500 / (Math.max.apply(Math, _.pluck(data, 'txEnd')) - Math.min.apply(Math, _.pluck(data, 'txStart')));

		let rows = this.row(data, multiplyingFactor);

		return (
				<div className="exons">
					{rows}
				</div>
			);
	}
});

module.exports = Exons;
