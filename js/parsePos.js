'use strict';

var _ = require('./underscore_ext');
var unicode = require('./unicode_utils');
var chromInfo = require('./chromInfo');

var toInt = x => parseInt(x, 10);
var clip = (len, x) => x < 1 ? 1 : (x > len ? len : x);
var M = 1000 * 1000;

module.exports = function (text, assembly) {
	// strip spaces, cvt to lower, match chr1:2-chr3:4 format
	text = unicode.normalize(text).replace(/ /g, '').toLowerCase();
	var pos = text.match(/^(chr[0-9xyXY]+)(:([0-9]+)-([0-9]+))?$/);
	if (pos) {
		let chrom = pos[1].replace(/x/, 'X').replace(/y/, 'Y'),
			maxEnd = _.getIn(chromInfo, [assembly, chrom], 250 * M),
			baseStart, baseEnd;

		if (pos[2] !== undefined) {
			baseEnd = clip(maxEnd, toInt(pos[4]));
			baseStart = clip(baseEnd, toInt(pos[3]));
		} else {
			baseStart = 1;
			baseEnd = maxEnd;
		}
		return {chrom, baseStart, baseEnd};
	}
};
