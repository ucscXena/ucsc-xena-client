'use strict';

// Find contiguous intron regions across a set of transcripts, i.e.
// regions without any exons. These are not, strictly speaking, 'introns',
// but intronic regions in every transcript.

var _ = require('./underscore_ext');

// Create a group with one exon
var initGroup = exon => ({
	start: exon.start,
	end: exon.end,
	exons: [exon]
});

var push = (arr, v) => (arr.push(v), arr);

// Update a group with an overlapping exon
function updateGroup(group, exon) {
	var newEnd = group.end < exon.end ? exon.end : group.end;
	return {
		start: group.start,
		end: newEnd,
		exons: push(group.exons, exon)
	};
}

function mergeTop(groups, exon) {
	var len = groups.length - 1,
		last = groups[len];
	if (last.start <= exon.end && exon.start <= last.end) {
		groups[len] = updateGroup(last, exon);
	} else {
		groups.push(initGroup(exon));
	}
	return groups;
}

// findIntrons(exons :: [[{start, end}, {start, end}, ...], ...]) ::
//    [{start, end, exons: [...]}, ...]
//
// exons in the returned groups are sorted by start position.
function exonGroups(exons) {
	if (exons.length < 1) {
		return [];
	}
	var sorted = _.sortBy(exons, 'start'),
		[first, ...rest] = sorted;
	return rest.reduce(mergeTop, [initGroup(first)]);
}

function intronRegions(groups) {
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
