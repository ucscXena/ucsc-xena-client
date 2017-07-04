'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var {allExons, exonGroups, intronRegions} = require('../findIntrons');
var {smallBox, bigBox} = require('./Exons');
import '../../css/transcript_css/exons.css';

var width = 700;
//assuming intronRegions is a 2D array like so: [[10,30], [70,100]]
function newCoordinates(data, intronRegions, exonGroupGroupBy) {
  var [exonStartsCopy, exonEndsCopy, cdsStartCopy, cdsEndCopy] = [[...data.exonStarts], [...data.exonEnds], data.cdsStart, data.cdsEnd];
  let labels = [];
  intronRegions.forEach(intron => {
    data.exonStarts.forEach( (exonStarts, index) => {
      intron[1] <= exonStarts ? ( exonStartsCopy[index] -= (intron[1] - intron[0]),
      exonEndsCopy[index] -= (intron[1] - intron[0]) ) : null;
    });
    intron[1] <= data.cdsStart ? cdsStartCopy -= (intron[1] - intron[0]) : null;
    intron[1] <= data.cdsEnd ? cdsEndCopy -= (intron[1] - intron[0]) : null;
  });
  data.exonStarts.forEach( (exonStarts, index) => {
    exonGroupGroupBy.forEach( (exonGroup, i) => {
      _.sortBy(_.keys(exonGroup)).forEach((key, j) => {
        if(('{"start":' + exonStarts + ',"end":' + data.exonEnds[index] + '}') === key)
        {
          data.strand === '-' ? labels.push(exonGroupGroupBy.length - i + exonGroup.suffix.charAt(_.keys(exonGroup).length - j - 1)) :
          labels.push(i + 1 + exonGroup.suffix.charAt(j - 1));
        }
      });
    });
  });
  return _.assoc(data, 'exonStarts', exonStartsCopy,
                       'exonEnds', exonEndsCopy,
                       'txStart', exonStartsCopy[0],
                       'txEnd', exonEndsCopy[data.exonCount - 1],
                       'cdsStart', cdsStartCopy,
                       'cdsEnd', cdsEndCopy,
                       'labels', labels);
}

function exonShape(data, exonStarts, exonEnds, cdsStart, cdsEnd, multiplyingFactor, strand, label, origin) {
  let width = exonEnds - exonStarts;
	if(cdsStart > exonEnds)
	{
		return smallBox( (exonStarts - origin), (width - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
	else if(exonStarts < cdsStart && cdsStart < exonEnds)
	{
    // here if-else is only for identifying a suitable box for labeling.
    // labeling is done on the longest of the two boxes.
    if((cdsStart - exonStarts) < (exonEnds - cdsStart - (5 / multiplyingFactor)))
		{
      return [smallBox( (exonStarts - origin), (cdsStart - exonStarts), multiplyingFactor, strand),
    bigBox( (cdsStart - origin), (exonEnds - cdsStart - (5 / multiplyingFactor)), multiplyingFactor, strand, label)];
    }
    else
    {
      return [smallBox( (exonStarts - origin), (cdsStart - exonStarts), multiplyingFactor, strand, label),
    bigBox( (cdsStart - origin), (exonEnds - cdsStart - (5 / multiplyingFactor)), multiplyingFactor, strand)];
    }
	}
	else if(exonStarts < cdsEnd && cdsEnd < exonEnds)
	{
    // here if-else is only for identifying a suitable box for labeling.
    // labeling is done on the longest of the two boxes.
    if((cdsEnd - exonStarts) > (exonEnds - cdsEnd - (5 / multiplyingFactor)))
    {
		return [bigBox( (exonStarts - origin), (cdsEnd - exonStarts), multiplyingFactor, strand, label),
    smallBox( (cdsEnd - origin), (exonEnds - cdsEnd - (5 / multiplyingFactor)), multiplyingFactor, strand)];
    }
    else
    {
		return [bigBox( (exonStarts - origin), (cdsEnd - exonStarts), multiplyingFactor, strand),
    smallBox( (cdsEnd - origin), (exonEnds - cdsEnd - (5 / multiplyingFactor)), multiplyingFactor, strand, label)];
    }
	}
	else if(cdsEnd < exonStarts)
	{
		return smallBox( (exonStarts - origin), (width - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
	else
	{
		return bigBox( (exonStarts - origin), (width - (5 / multiplyingFactor)), multiplyingFactor, strand, label);
	}
}

var ExonsOnly = React.createClass({

  row(data, multiplyingFactor) {

		return data.map((d, index) => {
      let origin = (Math.min.apply(Math, _.pluck(data, 'txStart')));
			let style = { width: ((d.txEnd - d.txStart) * multiplyingFactor - 5) + "px" };
			style = d.strand === '-' ? _.conj(style, ['right', ((d.txStart - origin) * multiplyingFactor) + "px"])
									 : _.conj(style, ['left', ((d.txStart - origin) * multiplyingFactor) + "px"]);

			return ( <div className="exons--row" id={index}>
						<div className="exons--row--axis"
							 style={style}/>
					{
						_.flatten(_.mmap(d.exonStarts, d.exonEnds, d.labels, (exonStarts, exonEnds, label) => {
              return exonShape(data, exonStarts, exonEnds, d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand, label, origin);
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
    var exonGroupGroupBy = exonGroupsList.map((exonGroup) => {
      return _.groupBy(exonGroup.exons.map(exon => { return ({json: JSON.stringify(exon), exon}); }), 'json');
    });
    exonGroupGroupBy.forEach(group => {
      if(_.keys(group).length === 1)
      {
        _.extend(group, {suffix: ""});
      }
      else
      {
        let suffix = "";
        _.keys(group).forEach((subgroup, j) => {
          subgroup = subgroup;
          suffix += String.fromCharCode(65 + j);
        });
        _.extend(group, {suffix: suffix});
      }
    });
    data = data.map(d => {
      return newCoordinates(d, intronRegionsList, exonGroupGroupBy);
    });
    let multiplyingFactor = width / (Math.max.apply(Math, _.pluck(data, 'txEnd')) - Math.min.apply(Math, _.pluck(data, 'txStart')));
    let rows = this.row(data, multiplyingFactor);
    return (
      <div className="exons">
        {rows}
      </div>
    );
  }
});

module.exports = ExonsOnly;
