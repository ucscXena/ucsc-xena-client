/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet sample zoom indicator. Displays original state of samples when in zoom mode.
 *
 */

'use strict';

// TODO review insertion of div with height refer Column.js line 688

var _ = require('../underscore_ext');
import PureComponent from '../PureComponent';

var React = require('react');
var CanvasDrawing = require('../CanvasDrawing');
var {drawSamples} = require('../drawSamples');
var ColCard = require('./ColCard');

class SampleZoomIndicator extends PureComponent {

	render() {
		var {data, column, zoom} = this.props,
			{heatmap} = column,
			codes = _.get(data, 'codes'),
			width = 10;

		return (
			<div style={{width: width, position: 'relative'}}>
				<ColCard zoomCard={true}>
					<div style={{height: 63}}/>
					<CanvasDrawing
						ref='plot'
						draw={drawSamples}
						codes={codes}
						width={width}
						zoom={zoom}
						heatmapData={heatmap}/>
				</ColCard>
			</div>);
	}
};

module.exports = SampleZoomIndicator;
