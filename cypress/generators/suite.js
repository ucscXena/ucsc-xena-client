/*global describe: false, it: false, require: false, before: false */
'use strict';

var jsc = require('jsverify');

var pageLoadGenerator = require('./page-loading').generator;
var {cleanFailures, runSequence} = require('./util');

describe('page loading', function () {
	this.timeout(0); // no timeout
	before(cleanFailures);
	it('should load pages', function () {
		var property = jsc.forall(pageLoadGenerator, runSequence);
		// Set this flag at start. It will be reset if anything fails, so
		// we have the failing videos.
		process.env.CYPRESS_trashAssetsBeforeHeadlessRuns = 'true'; //eslint-disable-line camelcase
		// '094e61f879acb5320d' to invoke injected closebug
		return jsc.assert(property, {tests: 20/*, rngState: '094e61f879acb5320d'*/});
	});
});
