/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet sample zoom indicator. Displays original state of samples when in zoom mode.
 *
 */

'use strict';

// TODO review insertion of div with height refer Column.js line 688

// Core dependencies
import PureComponent from '../PureComponent';
var React = require('react');

// App dependencies
var _ = require('../underscore_ext');
var CanvasDrawing = require('../CanvasDrawing');
var ColCard = require('./ColCard');
var {drawSamples} = require('../drawSamples');
import ZoomCarriage from './ZoomCarriage';

// Styles
var compStyles = require('./SampleZoomIndicator.module.css');

function noZoom(samples, zoom) {
	return _.merge(zoom, {count: samples, index: 0});
}

// function getZoomControlYPos(samplesCount, zoom) {
// 		var posY = Math.round(zoom.height / samplesCount * zoom.index) - 8,
// 		zch = ((zoom.height / samplesCount).toFixed(2)) * zoom.count / 2;
//
// 	return (posY + zch);
// }

class SampleZoomIndicator extends PureComponent {
	state = {zWidth: 31};

	increaseWidth = () => {
		this.setState({zWidth: 23});
	};

	decreaseWidth = () => {
		this.setState({zWidth: 31});
	};

	render() {
		var {data, column, samples, zoom} = this.props,
			{zWidth} = this.state,
			{heatmap} = column,
			codes = _.get(data, 'codes'),
			width = 10;
			// zoomControlYPos = getZoomControlYPos(samples.length, zoom),

		return (
			<div className={compStyles.sampleZoomIndicator} style={{width: width}} onMouseOver={this.increaseWidth} onMouseOut={this.decreaseWidth}>
				<ColCard zoomCard={true}>
					<div style={{height: 63}}/>
					<div style={{position: 'relative'}}>
						<CanvasDrawing
							ref='plot'
							draw={drawSamples}
							codes={codes}
							width={width}
							zoom={noZoom(samples.length, zoom)}
							heatmapData={heatmap}/>
						<ZoomCarriage samplesCount={samples.length} width={zWidth} zoom={zoom}/>
					</div>
				</ColCard>
			</div>);
	}
};

module.exports = SampleZoomIndicator;
