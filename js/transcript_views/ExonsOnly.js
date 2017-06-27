'use strict';
var React = require('react');
import '../../css/transcript_css/exons.css';

//assuming intronRegions is a 2D array like so: [[10,30], [70,100]]
function newCoordinates(data, intronRegions) {
  var [exonStartsCopy, exonEndsCopy] = [[...data.exonStarts], [...data.exonEnds]];
  intronRegions.forEach(intron => {
    data.exonStarts.forEach( (exonStarts, index) => {
      intron[1] < exonStarts ? ( exonStartsCopy[index] -= (intron[1] - intron[0]),
                                 exonEndsCopy[index] -= (intron[1] - intron[0]) ) : null;
    });
  });
  data.exonStarts = [...exonStartsCopy];
  data.exonEnds = [...exonEndsCopy];
  return data;
}

var ExonsOnly = React.createClass({

  render() {
    let data = this.props.data ? this.props.data : [];
    let intronRegions = [[7661700, 7661770], [7674800, 7674850]];
    data = data.map(d => {
      return newCoordinates(d, intronRegions);
    });
    return null;
  }
});

module.exports = ExonsOnly;
