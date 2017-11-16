'use strict';
var React = require('react');
var _ = require('../underscore_ext');

var styles = require('./Exons.module.css');
var {deepPureRenderMixin} = require('../react-utils');

var width = 700;

function box(type, startsAt, width, multiplyingFactor, strand, pad = 0, zoom = false, label = "") {
	let exon = {
					type: type,
					label: label,
					width: (width * multiplyingFactor) + "px",
					origin: strand === '-' ? "right" : "left",
					position: (startsAt * multiplyingFactor) + pad + "px",
					zoom: zoom
				};
	return exon;
}

function renderExon(exon) {
	let style = {
		width: exon.width,
		[exon.origin]: exon.position
	};
	if(exon.type === 'small')
	{
		let boxClass = exon.zoom ? "exons--row--item-small--zoom" : "exons--row--item-small";
		return (<div className={styles[boxClass]}
						style={style}>
						<span>{exon.label}</span>
					</div>);
	}
	else if(exon.type === 'big')
	{
			let boxClass = exon.zoom ? "exons--row--item-big--zoom" : "exons--row--item-big";
			return (<div className={styles[boxClass]}
							style={style}>
							<span>{exon.label}</span>
						</div>);
		}
	}

function exonShape(data, exonStarts, exonEnds, cdsStart, cdsEnd, multiplyingFactor, strand, origin) {

	let exonWidth = exonEnds - exonStarts;
	let startsAt = exonStarts - origin;
	if(cdsStart === cdsEnd)
	{
		return [box( 'small', startsAt, exonWidth, multiplyingFactor, strand)];
	}
	else if(cdsStart > exonEnds)
	{
		return [box( 'small', startsAt, exonWidth, multiplyingFactor, strand)];
	}
	else if(exonStarts < cdsStart && cdsStart < exonEnds)
	{
		let exonWidth1 = cdsStart - exonStarts;
		let exonWidth2 = exonEnds - cdsStart;
		return [box( 'small', startsAt, exonWidth1, multiplyingFactor, strand),
			box( 'big', (cdsStart - origin), exonWidth2, multiplyingFactor, strand)];
	}
	else if(exonStarts < cdsEnd && cdsEnd < exonEnds)
	{
		let exonWidth1 = cdsEnd - exonStarts;
		let exonWidth2 = exonEnds - cdsEnd;
		return [box( 'big', startsAt, exonWidth1, multiplyingFactor, strand),
			box( 'small', (cdsEnd - origin), exonWidth2, multiplyingFactor, strand)];
	}
	else if(cdsEnd < exonStarts)
	{
		return [box( 'small', startsAt, exonWidth, multiplyingFactor, strand)];
	}
	else
	{
		return [box( 'big', startsAt, exonWidth, multiplyingFactor, strand)];
	}
}

var Exons = React.createClass({
	mixins: [deepPureRenderMixin],
	row(data, multiplyingFactor, origin) {

		return data.map((d, index) => {

			let style = {
				width: ((d.txEnd - d.txStart) * multiplyingFactor) + "px",
				[d.strand === '-' ? 'right' : 'left']: ((d.txStart - origin) * multiplyingFactor) + "px"
			};

			return ( <div className={styles["exons--row"]} id={index}>
						<div className={styles["exons--row--axis"]}
							 style={style}/>
					{
						_.flatten(_.mmap(d.exonStarts, d.exonEnds, (exonStarts, exonEnds) => {
							return _.map(exonShape(data, exonStarts, exonEnds, d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand, origin), renderExon);
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
				<div className={styles.exons}>
					{rows}
				</div>
			);
	}
});

module.exports = {
	Exons,
	box,
	renderExon
};
