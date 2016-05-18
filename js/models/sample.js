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
	// currying a varargs fn, which is a bit wonky, but note that we should
	// never have cohortIndex passed in through the external API. It's
	// purely an implementation detail. We recursively call the non-curried
	// fn.
	lookupSample: _.curryN(2, lookupSample)
};
