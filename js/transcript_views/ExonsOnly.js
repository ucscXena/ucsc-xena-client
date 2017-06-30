'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var {allExons, exonGroups, intronRegions} = require('../findIntrons');
var {smallBox, bigBox} = require('./Exons');
import '../../css/transcript_css/exons.css';

//assuming intronRegions is a 2D array like so: [[10,30], [70,100]]
function newCoordinates(data, intronRegions, exonGroupsList) {
  var [exonStartsCopy, exonEndsCopy, cdsStartCopy, cdsEndCopy] = [[...data.exonStarts], [...data.exonEnds], data.cdsStart, data.cdsEnd];
  data.labels = [];
  intronRegions.forEach(intron => {
    data.exonStarts.forEach( (exonStarts, index) => {
      exonGroupsList.forEach((exonGroup, position) => {
        (exonGroup.start <= exonStarts && data.exonEnds[index] <= exonGroup.end) ? data.labels[index] =
        (data.strand === '-' ? exonGroupsList.length - position : position + 1) : null;
      });
      intron[1] <= exonStarts ? ( exonStartsCopy[index] -= (intron[1] - intron[0]),
      exonEndsCopy[index] -= (intron[1] - intron[0]) ) : null;
    });
    intron[1] <= data.cdsStart ? cdsStartCopy -= (intron[1] - intron[0]) : null;
    intron[1] <= data.cdsEnd ? cdsEndCopy -= (intron[1] - intron[0]) : null;
  });
  console.log("dl", data.labels);
  data.exonStarts = [...exonStartsCopy];
  data.exonEnds = [...exonEndsCopy];
  data.txStart = exonStartsCopy[0];
  data.txEnd = exonEndsCopy[data.exonCount - 1];
  data.cdsStart = cdsStartCopy;
  data.cdsEnd = cdsEndCopy;
  return data;
}

function exonShape(data, exonStarts, exonEnds, cdsStart, cdsEnd, multiplyingFactor, strand, label) {
	if(cdsStart > exonEnds)
	{
		return smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
	else if(exonStarts < cdsStart && cdsStart < exonEnds)
	{
		return [smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (cdsStart - exonStarts), multiplyingFactor, strand),
    bigBox( (cdsStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - cdsStart - (5 / multiplyingFactor)), multiplyingFactor, strand, label)];
	}
	else if(exonStarts < cdsEnd && cdsEnd < exonEnds)
	{
		return [bigBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (cdsEnd - exonStarts), multiplyingFactor, strand, label),
    smallBox( (cdsEnd - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - cdsEnd - (5 / multiplyingFactor)), multiplyingFactor, strand)];
	}
	else if(cdsEnd < exonStarts)
	{
		return smallBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
	else
	{
		return bigBox( (exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
}

var ExonsOnly = React.createClass({

  row(data, multiplyingFactor) {

		return data.map((d, index) => {
			let style = { width: ((d.txEnd - d.txStart) * multiplyingFactor - 5) + "px", zIndex: "10" };
			style = d.strand === '-' ? _.conj(style, ['right', ((d.txStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))) * multiplyingFactor) + "px"])
									 : _.conj(style, ['left', ((d.txStart - (Math.min.apply(Math, _.pluck(data, 'txStart')))) * multiplyingFactor) + "px"]);

			return ( <div className="exons--row" id={index}>
						<div className="exons--row--axis"
							 style={style}/>
					{
						_.flatten(_.mmap(d.exonStarts, d.exonEnds, d.labels, (exonStarts, exonEnds, label) => {
              // return bigBox((exonStarts - (Math.min.apply(Math, _.pluck(data, 'txStart')))), (exonEnds - exonStarts - (5 / multiplyingFactor)), multiplyingFactor, d.strand);
              return exonShape(data, exonStarts, exonEnds, d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand, label);
						}))
					}
					</div>
					);
		});
  },

  render() {
    let data = this.props.data ? this.props.data : [];
    let allExonsList = allExons(data);
    let exonGroupsList = exonGroups(allExonsList);
    let intronRegionsList = intronRegions(exonGroupsList);
    data = data.map(d => {
      return newCoordinates(d, intronRegionsList, exonGroupsList);
    });
    let multiplyingFactor = 500 / (Math.max.apply(Math, _.pluck(data, 'txEnd')) - Math.min.apply(Math, _.pluck(data, 'txStart')));
    let rows = this.row(data, multiplyingFactor);
    return (
      <div className="exons"
          style={{backgroundColor: "", zIndex: "1"}}>
        {rows}
      </div>
    );
  }
});

module.exports = ExonsOnly;
