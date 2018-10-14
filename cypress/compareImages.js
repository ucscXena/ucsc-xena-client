'use strict';
var fs = require('fs'),
    PNG = require('pngjs').PNG,
    pixelmatch = require('pixelmatch');

var dir = process.argv[2];
var filePath = name => `${__dirname}/screenshots/${dir}/${name}.png`;
var file1 = process.argv[3];
var file2 = process.argv[4];
var left = process.argv[5] || 0;

var img1 = fs.createReadStream(filePath(file1))
				.pipe(new PNG()).on('parsed', doneReading),
    img2 = fs.createReadStream(filePath(file2))
				.pipe(new PNG()).on('parsed', doneReading),
    filesRead = 0;

function crop(img, left) {
	var {width, height} = img,
		dst = new PNG({width: width - left, height});

	// note that new PNG objects are not zeroed, so if any region isn't
	// written, it will be variable.

	img.bitblt(dst, left, 0, width - left, height, 0, 0);
	return dst;
}

function doneReading() {
    if (++filesRead < 2) {
		return;
	};
    var diff = new PNG({width: img1.width, height: img1.height}),
		crop1 = crop(img1, left),
		crop2 = crop(img2, left);

    var mismatch = pixelmatch(crop1.data, crop2.data, diff.data, crop1.width, crop1.height, {threshold: 0.1});

	console.log(mismatch > 0 ? 'differ' : 'same', mismatch);
    diff.pack().pipe(fs.createWriteStream(filePath(`${file1}-${file2}-diff`)));
}
