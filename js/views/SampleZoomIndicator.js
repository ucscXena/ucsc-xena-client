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

class SampleZoomIndicator extends PureComponent {

	render() {
		var {data, column, columnHover, samples, zoom, onZoomOut} = this.props,
			{heatmap} = column,
			codes = _.get(data, 'codes'),
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
						<ZoomCarriage columnHover={columnHover} samplesCount={samples.length} width={width} zoom={zoom} zoomOut={onZoomOut}/>
					</div>
				</ColCard>
			</div>);
	}
};

module.exports = SampleZoomIndicator;
