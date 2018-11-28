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

function getZoomControlYPos(samplesCount, zoom) {
		var posY = (Math.round((zoom.height / samplesCount) * zoom.index) - 9),
		zch = Math.round((zoom.height / samplesCount).toFixed(2) * zoom.count / 2);

	return (posY + zch);
}

class SampleZoomIndicator extends PureComponent {

	render() {
		var {data, column, zoomOut, samples, zoom} = this.props,
			{heatmap} = column,
			codes = _.get(data, 'codes'),
			zoomControlYPos = getZoomControlYPos(samples.length, zoom),
			width = 10;

		return (
			<div className={compStyles.sampleZoomIndicator} style={{width: width}}>
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
						<div className={compStyles.zoomCarriage}><a className={compStyles.zoomControl} style={{top: zoomControlYPos}} onClick={zoomOut}><i className='material-icons'>remove_circle</i></a><ZoomCarriage samplesCount={samples.length} width={31} zoom={zoom}/></div>
					</div>
				</ColCard>
			</div>);
	}
};

module.exports = SampleZoomIndicator;
