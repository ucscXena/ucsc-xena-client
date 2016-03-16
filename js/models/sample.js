/*global require: false, module: false */
'use strict';

var _ = require('../underscore_ext');
module.exports = {
	makeSample: _.curry((cohort, sampleID) => ({cohort, sampleID}))
};
