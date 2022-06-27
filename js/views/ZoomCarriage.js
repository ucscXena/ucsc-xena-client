/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena spreadsheet zoom carriage. Displays zoom carriage and zoom reference lines to Columns spreadsheet.
 *
 */


import PureComponent from '../PureComponent';
import {Box} from '@material-ui/core';
import {xenaColor} from '../xenaColor';

var React = require('react');

// Styles
var compStyles = require('./ZoomCarriage.module.css');
var classNames = require('classnames');

class ZoomCarriage extends PureComponent {

	getRotation = (angle) => {
		return 'rotate(' + angle + 'deg)';
	};

	render() {
		var {addColumnAddHover, enableTransition, samplesCount, zoom} = this.props,
			zoomCarriageMargin = addColumnAddHover ? 3 : 11,
			carriageStart = Math.floor((zoom.height / samplesCount) * zoom.index),
			carriageHeight = Math.floor((zoom.height / samplesCount) * zoom.count),
			carriageEnd = carriageStart + carriageHeight,
			heightBelowCarriage = zoom.height - carriageStart - carriageHeight,
			upperAngle = -Math.atan(carriageStart / zoomCarriageMargin) * 180 / Math.PI,
			upperLine = Math.sqrt(Math.pow(zoomCarriageMargin, 2) + Math.pow(carriageStart, 2)),
			lowerAngle = Math.atan((heightBelowCarriage) / zoomCarriageMargin) * 180 / Math.PI,
			lowerLine = Math.sqrt(Math.pow(zoomCarriageMargin, 2) + Math.pow(heightBelowCarriage, 2));
		return (
			<div className={compStyles.zoomCarriage}>
				<Box component='div' className={compStyles.carriage} style={{height: carriageHeight, top: carriageStart}} sx={{borderColor: xenaColor.BLACK_24}}/>
				<Box component='div' className={classNames(compStyles.carriageLines, compStyles.upper, {[compStyles.transitionRotate]: enableTransition})}
					 style={{top: carriageStart, transform: this.getRotation(upperAngle), width: upperLine}} sx={{borderColor: xenaColor.BLACK_24}}/>
				<Box component='div' className={classNames(compStyles.carriageLines, compStyles.lower, {[compStyles.transitionRotate]: enableTransition})}
					 style={{top: carriageEnd, transform: this.getRotation(lowerAngle), width: lowerLine}} sx={{borderColor: xenaColor.BLACK_24}}/>
			</div>);
	}
};

export default ZoomCarriage;
