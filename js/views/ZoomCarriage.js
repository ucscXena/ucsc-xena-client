/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet zoom carriage. Displays zoom carriage and zoom reference lines to Columns spreadsheet.
 *
 */

'use strict';

import PureComponent from '../PureComponent';

var React = require('react');
var CanvasDrawing = require('../CanvasDrawing');
var {drawZoomCarriage} = require('../drawZoomCarriage');

// Styles

class ZoomCarriage extends PureComponent {

	render() {
		var {samplesCount, width, zoom} = this.props;

		return (
			<CanvasDrawing
				ref='plot'
				draw={drawZoomCarriage}
				samplesCount={samplesCount}
				width={width}
				zoomCarriage={true}
				zoom={zoom}/>);
	}
};

module.exports = ZoomCarriage;
