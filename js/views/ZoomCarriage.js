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
var classNames = require('classnames');

class ZoomCarriage extends PureComponent {

	getRotation = (angle) => {
		return 'rotate(' + angle + 'deg)';
	};


	render() {
		var {samplesCount, zoom, zoomOut} = this.props,
			startOfCarriage = Math.round((zoom.height / samplesCount) * zoom.index),
			carriageHeight = Math.round((zoom.height / samplesCount).toFixed(2) * zoom.count),
			endOfCarriage = startOfCarriage + carriageHeight - 1,
			endCarriageToBottom = zoom.height - startOfCarriage - carriageHeight,
			angleUpper = -Math.atan(startOfCarriage / 11) * 180 / Math.PI,
			upperLine = Math.sqrt(Math.pow(11, 2) + Math.pow(startOfCarriage, 2)),
			angleLower = Math.atan((endCarriageToBottom) / 11) * 180 / Math.PI,
			lowerLine = Math.sqrt(Math.pow(11, 2) + Math.pow(endCarriageToBottom, 2));

		return (
			<div className={compStyles.zoomCarriage}>
				<div className={compStyles.carriage} style={{height: carriageHeight, top: startOfCarriage}}>
					<div className={compStyles.zoomControl} onClick={zoomOut}>remove_circle</div>
				</div>
				<div className={classNames(compStyles.carriageLines, compStyles.upper)}
					 style={{top: startOfCarriage, transform: this.getRotation(angleUpper), width: upperLine}}/>
				<div className={classNames(compStyles.carriageLines, compStyles.lower)}
					 style={{top: endOfCarriage, transform: this.getRotation(angleLower), width: lowerLine}}/>
			</div>);
	}
};

module.exports = ZoomCarriage;
