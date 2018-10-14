/*global describe: false, it: false, require: false, before: false */
'use strict';

var fs = require('fs');
var path = require('path');
var execSync = require('child_process').execSync;

var list = fs.readFileSync('bookmarks/persist.txt').toString();
var bookmarks = list.split(/\n/).map(x => x.trim()).filter(x => x.length > 0)
	.map(line => line.split(/[ \t]+/)[0]);

var tmpDir = 'cypress/tmp';
var width = 2000; // still gets clipped to 1280, somewhere

var headed = process.env.HEADED == null ? '' : '--headed';
var cmd = `./node_modules/.bin/cypress run ${headed} --config video=false,viewportWidth=${width} --reporter xunit --reporter-options output=${path.join(tmpDir, 'cypress-result.xml')} --spec cypress/integration/bookmark-spec.js`;

function loadBookmark(bookmark) {
	process.env.CYPRESS_BOOKMARK = bookmark;
	try {
		var ret = execSync(cmd);
		console.log(ret.toString());
		return true;
	} catch (e) {
		console.log(e.stdout.toString());
		console.log(e.stderr.toString());
		return false;
	}
}

describe('page loading', function () {
	this.timeout(0); // no timeout

	it('should load bookmarks', function () {
		process.env.CYPRESS_trashAssetsBeforeRuns = 'false'; //eslint-disable-line camelcase

		bookmarks.forEach(bookmark => {
			loadBookmark(bookmark);
		});
	});
});

