'use strict';

// Reference http://diveintohtml5.info/canvas.html
// x and y start position moved by 0.5px
function draw(vg, opts) {
	var {count, height, index, samplesCount, width} = opts,
		posY = Math.round((height / samplesCount) * index) + 0.5,
		zch = Math.round((height / samplesCount).toFixed(2) * count),
		zcw = 20;

	vg.smoothing(false); // For some reason this works better if we do it every time.

	vg.drawRectangles([[0.5, posY, zcw, zch]],
		{
			fillStyle: 'rgba(255, 255, 255, 0.8)',
			strokeStyle: 'rgba(0, 0, 0, 0.24)',
			lineWidth: 1
		});

	/* Upper line */
	vg.dashedLine((0.5 + zcw), posY, width, 0, 'rgba(0, 0, 0, 0.38)');

	/* Lower line */
	vg.dashedLine((0.5 + zcw), (posY + zch), width, height, 'rgba(0, 0, 0, 0.38)');

}

var drawZoomCarriage = (vg, props) => {
	let {samplesCount, width, zoom} = props,
		{count, height, index} = zoom;

	vg.labels(() => {
		draw(vg, {
			height,
			width,
			index,
			samplesCount,
			count
		});
	});
};

module.exports = {drawZoomCarriage};
