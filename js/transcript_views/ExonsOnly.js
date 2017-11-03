'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var {allExons, exonGroups, intronRegions} = require('../findIntrons');
var {box, renderExon} = require('./Exons');
import '../../css/transcript_css/exons.css';
var {deepPureRenderMixin} = require('../react-utils');

const width = 700;
const padding = 5;
var suffixList = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

var suffix = (len, i, neg) =>
	len === 1 ? "" :
	neg ? suffixList.charAt(len - i - 1) :
	suffixList.charAt(i);

var exonLabel = (len, i, neg) =>
	(neg ? len - i : i + 1).toString();

var isBefore = start => ([, end]) => end <= start;
var calcLength = ([s, e]) => e - s;
var subtract = (x, y) => x - y;
var intronLengthBefore = _.curry((introns, x) =>
	_.sum(introns.filter(isBefore(x)).map(calcLength)));

// intronRegions is a 2D array like so: [[10,30], [70,100]]
function newCoordinates(data, intronRegions, labelsAndPad) {
  var offsets = data.exonStarts.map(intronLengthBefore(intronRegions)),
	  exonStartsCopy = _.mmap(data.exonStarts, offsets, subtract),
	  exonEndsCopy = _.mmap(data.exonEnds, offsets, subtract),
	  cdsStartCopy = data.cdsStart - intronLengthBefore(intronRegions, data.cdsStart),
	  cdsEndCopy = data.cdsEnd - intronLengthBefore(intronRegions, data.cdsEnd),
	  exonLabelsAndPad = _.mmap(data.exonStarts, data.exonEnds, (start, end) => labelsAndPad[start][end]);

  return _.assoc(data, 'exonStarts', exonStartsCopy,
                       'exonEnds', exonEndsCopy,
                       'txStart', exonStartsCopy[0],
                       'txEnd', exonEndsCopy[data.exonCount - 1],
                       'cdsStart', cdsStartCopy,
                       'cdsEnd', cdsEndCopy,
                       'labelsAndPad', exonLabelsAndPad);
}


var cmpExons = (e1, e2) =>
	e1.start > e2.start ? 1 :
	e1.start < e2.start ? -1 :
	e1.end > e2.end ? 1 :
	e1.end < e2.end ? -1 :
	0;

function exonLabelsAndPad(exonGroups, neg) {
	var uniqExonGroups = exonGroups.map(exonGroup =>
		_.uniq(exonGroup.exons.map(exon => JSON.stringify(exon)))
			.map(es => JSON.parse(es))
			.sort(cmpExons)),
		labels = _.apply(_.merge)(_.flatmap(uniqExonGroups, (exonGroup, i) =>
			exonGroup
				.map((exon, j) => [exon.start, exon.end, i * padding, exonLabel(exonGroups.length, i, neg) + suffix(exonGroup.length, j, neg)])
				.reduce((acc, [start, end, pad, label]) => _.assocIn(acc, [start, end], {pad, label}), {})));
	return labels;
}

var exonShape = (cdsStart, cdsEnd, multiplyingFactor, strand, origin, zoom) => (exonStarts, exonEnds, {label, pad}) => {
	var exonWidth = exonEnds - exonStarts,
		startsAt = exonStarts - origin;
	if (cdsStart === cdsEnd) {
		return [box('small', startsAt, exonWidth, multiplyingFactor, strand, pad, zoom, label)];
	} else if (cdsStart > exonEnds) {
		return [box('small', startsAt, exonWidth, multiplyingFactor, strand, pad, zoom, label)];
	} else if (exonStarts < cdsStart && cdsStart < exonEnds) {
		let exonWidth1 = cdsStart - exonStarts;
		let exonWidth2 = exonEnds - cdsStart;
		// here if-else is only for identifying a suitable box for labeling.
		// labeling is done on the longest of the two boxes.
		if (exonWidth1 < exonWidth2) {
			return [box('small', startsAt, exonWidth1, multiplyingFactor, strand, pad, zoom),
				   box('big', cdsStart - origin, exonWidth2, multiplyingFactor, strand, pad, zoom, label)];
		} else {
			return [box('small', startsAt, exonWidth1, multiplyingFactor, strand, pad, zoom, label),
				   box('big', cdsStart - origin, exonWidth2, multiplyingFactor, strand, pad, zoom)];
		}
	} else if (exonStarts < cdsEnd && cdsEnd < exonEnds) {
		let exonWidth1 = cdsEnd - exonStarts;
		let exonWidth2 = exonEnds - cdsEnd;
		// here if-else is only for identifying a suitable box for labeling.
		// labeling is done on the longest of the two boxes.
		if (exonWidth1 > exonWidth2) {
			return [box('big', startsAt, exonWidth1, multiplyingFactor, strand, pad, zoom, label),
				   box('small', cdsEnd - origin, exonWidth2, multiplyingFactor, strand, pad, zoom)];
		} else {
			return [box('big', startsAt, exonWidth1, multiplyingFactor, strand, pad, zoom),
				   box('small', cdsEnd - origin, exonWidth2, multiplyingFactor, strand, pad, zoom, label)];
		}
	} else if (cdsEnd < exonStarts) {
		return [box('small', startsAt, exonWidth, multiplyingFactor, strand, pad, zoom, label)];
	} else {
		return [box('big', startsAt, exonWidth, multiplyingFactor, strand, pad, zoom, label)];
	}
};

function drawRows(data, multiplyingFactor, origin, getNameZoom) {
	return data.map((d, index) => {
		var firstPad = _.first(d.labelsAndPad).pad,
			lastPad = _.last(d.labelsAndPad).pad,
			extraAxisWidth = lastPad - firstPad,
			style = {
				width: ((d.txEnd - d.txStart) * multiplyingFactor) + extraAxisWidth + "px",
				[d.strand === '-' ? 'right' : 'left']: ((d.txStart - origin) * multiplyingFactor) + firstPad + "px"
			},
			rowClass = d.zoom ? "exons--row--zoom" : "exons--row",
			transcriptExonShape = exonShape(d.cdsStart, d.cdsEnd, multiplyingFactor, d.strand, origin, d.zoom),
			allBoxes = _.flatten(_.mmap(d.exonStarts, d.exonEnds, d.labelsAndPad, transcriptExonShape));
		return (
			<div className={rowClass} id={index} onClick={() => getNameZoom(d.name)}>
				<div className="exons--row--axis" style={style}/>
				{allBoxes.map(renderExon)}
			</div>);
	});
}

var ExonsOnly = React.createClass({
	mixins: [deepPureRenderMixin],

	render() {
		var data = this.props.data ? this.props.data : [],
			exonGroupsList = exonGroups(allExons(data)),
			intronRegionsList = intronRegions(exonGroupsList),
			labelsAndPad = exonLabelsAndPad(exonGroupsList, _.getIn(data, [0, 'strand']) === '-'),
			exonGroupsWidth = width - padding * (exonGroupsList.length - 1),
			newData = data.map(d => newCoordinates(d, intronRegionsList, labelsAndPad)),
			origin = _.min(newData, 'txStart').txStart,
			maxEnd = _.max(newData, 'txEnd').txEnd,
			multiplyingFactor = exonGroupsWidth / (maxEnd - origin),
			rows = drawRows(newData, multiplyingFactor, origin, this.props.getNameZoom);
		return (
				<div className="exons">
					{rows}
				</div>);
	}
});

module.exports = ExonsOnly;
