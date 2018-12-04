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
		var {addColumnAddHover, samplesCount, zoom, zoomOut} = this.props,
			zoomCarriageMargin = addColumnAddHover ? 3 : 11,
			carriageStart = Math.round((zoom.height / samplesCount) * zoom.index),
			carriageHeight = Math.round((zoom.height / samplesCount).toFixed(2) * zoom.count),
			carriageEnd = carriageStart + carriageHeight - 1,
			heightBelowCarriage = zoom.height - carriageStart - carriageHeight,
			upperAngle = -Math.atan(carriageStart / zoomCarriageMargin) * 180 / Math.PI,
			upperLine = Math.sqrt(Math.pow(zoomCarriageMargin, 2) + Math.pow(carriageStart, 2)),
			lowerAngle = Math.atan((heightBelowCarriage) / zoomCarriageMargin) * 180 / Math.PI,
			lowerLine = Math.sqrt(Math.pow(zoomCarriageMargin, 2) + Math.pow(heightBelowCarriage, 2));

		console.log(addColumnAddHover);

		return (
			<div className={compStyles.zoomCarriage}>
				<div className={compStyles.carriage} style={{height: carriageHeight, top: carriageStart}}>
					<div className={compStyles.zoomControl} onClick={zoomOut}>remove_circle</div>
				</div>
				<div className={classNames(compStyles.carriageLines, compStyles.upper)}
					 style={{top: carriageStart, transform: this.getRotation(upperAngle), width: upperLine}}/>
				<div className={classNames(compStyles.carriageLines, compStyles.lower)}
					 style={{top: carriageEnd, transform: this.getRotation(lowerAngle), width: lowerLine}}/>
			</div>);
	}
};

module.exports = ZoomCarriage;
