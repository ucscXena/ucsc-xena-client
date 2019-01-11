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

// Styles
var compStyles = require('./ZoomHelpTag.module.css');

class ZoomHelpTag extends React.Component {
	render() {
		var {selection, xZoomRange} = this.props;
		if (selection) {
			var {crosshair, direction, offset, overlay, zone, zoomTo} = selection,
				annotationPct = Math.round(((zoomTo.end - zoomTo.start) / xZoomRange) * 100),
				annotationZoom = direction === 'h',
				crosshairVFromRightBounds = document.body.offsetWidth - crosshair.x,
				sampleRowFrom = zoomTo.index + 1,
				sampleRowTo = zoomTo.index + zoomTo.count,
				tagInstruction = overlay.sstart === overlay.send ? 'Drag to zoom' : annotationZoom ? `Zoomed to ${annotationPct}%` : `Zoomed to rows ${sampleRowFrom} - ${sampleRowTo}`,
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
