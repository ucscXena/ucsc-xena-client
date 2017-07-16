'use strict';

var _ = require('./underscore_ext');
var unicode = require('./unicode_utils');
var chromInfo = require('./chromInfo');
var centromere = require('./centromere');

var toInt = x => parseInt(x, 10);
var clip = (len, x) => x < 1 ? 1 : (x > len ? len : x);
var M = 1000 * 1000;

module.exports = function (text, assembly) {
	// strip spaces, cvt to lower, match chr1:2-chr3:4 format
	text = unicode.normalize(text).replace(/ /g, '').toLowerCase();

	var pos = text.match(/^(chr[0-9xyXY]+)([pq]?)(:([0-9,]+)(-([0-9,]+))?)?$/);

	if (pos) {
		let chrom = pos[1].replace(/x/, 'X').replace(/y/, 'Y'),
			cm = _.getIn(centromere, [assembly, chrom]),
			maxEnd = _.getIn(chromInfo, [assembly, chrom], 250 * M),
			baseStart, baseEnd;

		if (pos[3] !== undefined) {
			baseEnd = clip(maxEnd, toInt(pos[5].replace(/,/g, '')));
			baseStart = clip(baseEnd, toInt(pos[4].replace(/,/g, '')));
		} else if (cm && pos[2] === 'p') {
			baseStart = 1;
			baseEnd = cm - 1;
		} else if (cm && pos[2] === 'q') {
			baseStart = cm;
			baseEnd = maxEnd;
		} else {
			baseStart = 1;
			baseEnd = maxEnd;
		}
		return {chrom, baseStart, baseEnd};
	}
};
