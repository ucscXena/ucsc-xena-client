'use strict';
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    pixelmatch = require('pixelmatch');

var filePath = name => `${__dirname}/screenshots/${name}.png`;
var file1 = process.argv[2];
var file2 = process.argv[3];

var img1 = fs.createReadStream(filePath(file1))
				.pipe(new PNG()).on('parsed', doneReading),
    img2 = fs.createReadStream(filePath(file2))
				.pipe(new PNG()).on('parsed', doneReading),
    filesRead = 0;

function doneReading() {
    if (++filesRead < 2) {
		return;
	};
    var diff = new PNG({width: img1.width, height: img1.height});

    var mismatch = pixelmatch(img1.data, img2.data, diff.data, img1.width, img1.height, {threshold: 0.1});

	console.log(mismatch > 0 ? 'differ' : 'same', mismatch);
    diff.pack().pipe(fs.createWriteStream(filePath(`${file1}-${file2}-diff`)));
}
