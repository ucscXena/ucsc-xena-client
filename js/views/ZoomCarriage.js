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

// Styles
var compStyles = require('./ZoomCarriage.module.css');

class ZoomCarriage extends PureComponent {

	getRotation = (angle) => {
		return "rotate(" + angle + "deg)";
	};

	render() {
		var {samplesCount, zoom} = this.props,
		topPos = Math.round((zoom.height / samplesCount) * zoom.index),
		heightCarriage = Math.round((zoom.height / samplesCount).toFixed(2) * zoom.count),
		botPos = topPos + heightCarriage - 1,
		botLength = zoom.height - topPos - heightCarriage,
		angleUpperIndicator = Math.atan(topPos / 11) * 180 / Math.PI,
		lengthUpperIndicator = Math.sqrt(Math.pow(11, 2) + Math.pow(topPos, 2)),
		angleLowerIndicator = Math.atan((botLength) / 11) * 180 / Math.PI,
		lengthLowerIndicator = Math.sqrt(Math.pow(11, 2) + Math.pow(botLength, 2));

		return (
			<div className={compStyles.zoomCarriage}>
				<div className={compStyles.carriage} style={{height: heightCarriage, top: topPos}}/>
				<div className={compStyles.carriageLines} style={{top: topPos, transform: this.getRotation(-angleUpperIndicator), width: lengthUpperIndicator}}/>
				<div className={compStyles.carriageLines} style={{top: botPos, transform: this.getRotation(angleLowerIndicator), width: lengthLowerIndicator}}/>
			</div>);
	}
};

module.exports = ZoomCarriage;
