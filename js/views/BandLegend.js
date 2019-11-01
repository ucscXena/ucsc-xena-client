
import React from 'react';
import CanvasDrawing2 from '../CanvasDrawing2';
import {rgb} from '../color_helper';

//// Styles
var compStyles = require('./BandLegend.module.css');

function draw(vg, opts) {
	var {range: {min, max}, colorScale, width, zoom: {height}} = opts,
		ctx = vg.context(),
		img = ctx.createImageData(width, height);

	for (let i = 0; i < width; ++i) {
		let color = rgb(colorScale((max - min) * i / width + min));
		for (let j = 0; j < height + 4; ++j) {
			let k = 4 * (j * width + i);
			img.data[k] = color[0];
			img.data[k + 1] = color[1];
			img.data[k + 2] = color[2];
			img.data[k + 3] = 255;
		}
	}

	ctx.putImageData(img, 0, 0);
}

var addClass = className => (el, i) =>
	React.cloneElement(el, {className, key: i});

class BandLegend extends React.Component {
	render() {
		var {range, multiScaled, width, height, footnotes, colorScale} = this.props,
			labels = multiScaled ? {min: 'low', max: 'high'} :
				{min: range.min.toPrecision(2), max: range.max.toPrecision(2)},
			drawing = (
				<CanvasDrawing2
					style={{width: '100%', height}}
					draw={draw}
					range={range}
					width={width}
					colorScale={colorScale}
					zoom={{height}}/>);
		return (
			<div className={compStyles.Legend}>
				<div className={compStyles.container}>
					<div className={compStyles.right}>{labels.max}</div>
					<div className={compStyles.center}>
						<div className={compStyles.left}>{labels.min}</div>
						<div className={compStyles.center}>
							{drawing}
						</div>
					</div>
				</div>
				{footnotes ? footnotes.map(addClass(compStyles.footnotes)) : null}
			</div>
		);
	}
}

module.exports = BandLegend;
