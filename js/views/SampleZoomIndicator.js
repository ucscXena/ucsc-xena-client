/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet sample zoom indicator. Displays original state of samples when in zoom mode.
 *
 */


// TODO review insertion of div with height refer Column.js line 688

// Core dependencies
import PureComponent from '../PureComponent';
import React from 'react';

// App dependencies
import * as _ from '../underscore_ext.js';

import CanvasDrawing from '../CanvasDrawing.js';
import ColCard from './ColCard.js';
import { drawSamples } from '../drawSamples.js';
import ZoomCarriage from './ZoomCarriage';

// Styles
import compStyles from "./SampleZoomIndicator.module.css";

function noZoom(samples, zoom) {
	return _.merge(zoom, {count: samples, index: 0});
}

class SampleZoomIndicator extends PureComponent {

	render() {
		var {data, column, addColumnAddHover, enableTransition, samples, zoom} = this.props,
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
						<ZoomCarriage addColumnAddHover={addColumnAddHover} enableTransition={enableTransition} samplesCount={samples.length} width={width} zoom={zoom}/>
					</div>
				</ColCard>
			</div>);
	}
}

export default SampleZoomIndicator;
