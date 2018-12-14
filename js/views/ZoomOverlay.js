/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Overlay displayed on mousedown and drag of gene or samples zoom.
 */

'use strict';

// Core dependencies, components
var React = require('react');

// Styles
var compStyles = require('./ZoomOverlay.module.css');

class ZoomOverlay extends React.Component {
	render() {
		var {selection, pxStart, pxEnd, samplesOffset} = this.props;
		console.log(selection, pxStart, pxEnd, samplesOffset);
		var {children} = this.props;
		return (
			<div className={compStyles.ZoomOverlay}>
				{children}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
