/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');

function lookupSample(cohortSamples, index, cohortIndex = 0) {
	var len = cohortSamples[cohortIndex].length;
	return cohortIndex >= cohortSamples.length ? null :
		(index < len ?  cohortSamples[cohortIndex][index] :
			lookupSample(cohortSamples, index - len, cohortIndex + 1));
}

module.exports = {
	lookupSample: _.curryN(2, lookupSample)
};
