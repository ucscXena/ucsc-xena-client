'use strict';

var unicode = require('./unicode_utils');

var toInt = x => parseInt(x, 10);

module.exports = function (text) {
	// strip spaces, cvt to lower, match chr1:2-chr3:4 format
	text = unicode.normalize(text).replace(/ /g, '').toLowerCase();
	var pos = text.match(/^(chr[0-9xy]+):([0-9]+)?-([0-9]+)$/),
		chromStart, baseStart, baseEnd;
	if (pos) {
		chromStart = pos[1];
		baseStart = toInt(pos[2]);
		baseEnd = toInt(pos[3]);
		if (baseStart) {
			baseStart = toInt(baseStart) - 1; // C convention
		}
		chromStart = chromStart.replace(/x/, 'X').replace(/y/, 'Y');
		return {chromStart, baseStart, baseEnd};
	}
};

/*
if (assembly) {
        chromInfo = assembly.chromInfo;
        newPos = _(chromPos).clone();


        if (!newPos.baseStart || newPos.baseStart < 0) {
                newPos.baseStart = 0;
        }
        newPos.baseStart = Math.min(newPos.baseStart, chromInfo[cs].size - 1);

        if (!newPos.baseEnd || newPos.baseEnd > chromInfo[ce].size) {
                newPos.baseEnd = chromInfo[ce].size;
        }
        newPos.baseEnd = Math.max(newPos.baseEnd, 1);

        if (cs === ce && newPos.baseEnd <= newPos.baseStart) {
                throw genomicPositionError("Invalid end base");
        }
*/
