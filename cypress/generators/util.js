'use strict';

var path = require('path');
var shell = require('shelljs');

var execSync = require('child_process').execSync;
var fs = require('fs');
var path = require('path');


var failureDir = './cypress/failures';

function cleanFailures() {
	var trash = shell.find(failureDir).filter(file => file.match(/\.(mp4|json)$/));
	trash.forEach(file => shell.rm(file));
}

function saveFailure(videoFile, sequenceFile) {
	var dstVideo = path.join(failureDir, path.basename(videoFile)),
		dstSeq = path.join(failureDir, path.basename(videoFile, path.extname(videoFile)) + '.json');
	console.log(`mv ${videoFile} ${dstVideo}`);
	shell.mv(videoFile, dstVideo);
	console.log(`mv ${sequenceFile} ${dstSeq}`);
	shell.mv(sequenceFile, dstSeq);
}

var tmpDir = 'cypress/tmp';

var headed = process.env.HEADED == null ? '' : '--headed';
var cmd = `./node_modules/.bin/cypress run ${headed} --reporter xunit --reporter-options output=${path.join(tmpDir, 'cypress-result.xml')} --spec cypress/integration/page-loading-spec.js`;

var sequenceFile = path.join(tmpDir, 'sequence.json');

function runSequence(seq) {
	fs.writeFileSync(sequenceFile, JSON.stringify(seq), 'utf8');
	process.env.CYPRESS_SEQUENCE_FILE = sequenceFile;
	try {
		var ret = execSync(cmd);
		console.log(ret.toString());
		return true;
	} catch (e) {
		// Save videos after failure
		// Would like to save sequence files, too.
		// Could set up another directory & do a before() method that
		// deletes it, checking CYPRESS_trashAssetsBeforeRuns, for
		// consistency.
		// Would then want to generate the seq file names randomly. Or
		// use the same name as the video file. That would be good, but
		// how do we get it? It's in the client. Can we set the video
		// file name from the server, via env? Nope. Not really any way
		// to get to the file name.
		//
		// We should be holding stdout, though, right?
		process.env.CYPRESS_trashAssetsBeforeRuns = 'false'; //eslint-disable-line camelcase
		// Started video recording: /Users/craft/ucsc-xena-client/cypress/videos/a4bo5.mp4
		console.log(e.stdout.toString());
		console.log(e.stderr.toString());
		var videoFile = e.stdout.toString().replace(/[\S\s]*Started video recording: (.*)[\S\s]*/m, "$1");
		saveFailure(videoFile, sequenceFile);
		return false;
	}
}

module.exports = {
	cleanFailures,
	saveFailure,
	runSequence
};
