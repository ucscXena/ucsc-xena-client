'use strict';

// Find contiguous intron regions across a set of transcripts, i.e.
// regions without any exons. These are not, strictly speaking, 'introns',
// but intronic regions in every transcript.

var _ = require('./underscore_ext');

function mergeTop(groups, exon) {
	var [first, ...rest] = groups, newEnd;
	if (first.start < exon.end && exon.start < first.end) {
		newEnd = first.end < exon.end ? exon.end : first.end;
		return [{start: first.start, end: newEnd}, ...rest];
	} else {
		return [exon, first, ...rest];
	}
}

// findIntrons(exons :: [[{start, end}, {start, end}, ...], ...]) ::
//    [[start, end], ...]
function exonGroups(exons) {
	var sorted = _.sortBy(exons, 'start'),
		[first, ...rest] = sorted;
	return rest.reduce(mergeTop, [first]).reverse();
}

function intronRegions(exons) {
	var groups = exonGroups(exons);
	return groups.slice(1).map(({start, end}, i) => ([groups[i].end, start]));
}


// exons(transcripts :: [{exonStarts, exonEnds}, ...]) :: [{start, end}, ...]
function allExons(transcripts) {
	return _.flatmap(transcripts, ({exonStarts, exonEnds}) =>
			_.mmap(exonStarts, exonEnds, (start, end) => ({start, end})));
}

module.exports = {
	allExons,
	exonGroups,
	intronRegions
};
