/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Zoom help tag displayed on mousedown and drag over gene or samples zoom.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var {Portal} = require('react-overlays');
var columnZoom = require('../columnZoom');

// Styles
var compStyles = require('./ZoomHelpTag.module.css');

// Return zoom text when user has pressed mouse down but has not yet moved the mouse
var defaultText = () => {
	return 'Drag to zoom';
};

// Return zoom text when user is currently executing a horizontal zoom
var geneZoomText = (annotationPct) => {
	return `Zoom to ${annotationPct < 1 ? `< 1` : annotationPct}%`;
};

// Return zoom text when user is currently executing a vertical zoom
var sampleZoomText = (zoomTo) => {
	var sampleRowFrom = zoomTo.index + 1,
		sampleRowTo = zoomTo.index + zoomTo.count;
	return zoomTo.count === 1 ? `Zoom to row ${sampleRowFrom}` : `Zoom to rows ${sampleRowFrom} - ${sampleRowTo}`;
};

class ZoomHelpTag extends React.Component {
	render() {
		var {column, selection} = this.props;
		if (selection) {
			var {crosshair, direction, offset, overlay, zone, zoomTo} = selection,
				{fieldType} = column,
				zoomToLength = columnZoom.zoomToLength({fieldType, zoomTo}),
				geneZoomPct = Math.round(zoomToLength / columnZoom.maxGeneZoomLength(column) * 100),
				annotationZoom = direction === 'h',
				noZoom = overlay.sstart === overlay.send,
				tagInstruction = noZoom ? defaultText() : annotationZoom ? geneZoomText(geneZoomPct) : sampleZoomText(zoomTo),
				crosshairVFromRightBounds = document.body.offsetWidth - crosshair.x,
				tagPosLeft = zone === 'a' ? crosshair.x : annotationZoom ? (offset.x + overlay.sstart === crosshair.x) ? 'unset' : crosshair.x : crosshair.x,
				tagPosRight = annotationZoom && zone === 's' && (offset.x + overlay.sstart === crosshair.x) ? crosshairVFromRightBounds : 'unset',
				tagPosTop = zone === 'a' ? (offset.y - 48) : annotationZoom ? crosshair.y : (offset.y + overlay.sstart === crosshair.y) ? (crosshair.y - 40) : crosshair.y;
		}
		return (
			<Portal container={document.body}>
				{selection ? <div className={compStyles.zoomHelpTag}
								  style={{left: tagPosLeft, right: tagPosRight, top: tagPosTop}}>
					<div className={compStyles.zoomInstructions}>{tagInstruction}</div>
				</div> : null}
			</Portal>
		);
	}
}

module.exports = ZoomHelpTag;
