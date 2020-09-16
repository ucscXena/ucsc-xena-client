/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Zoom help tag displayed on mousedown and drag over gene or samples zoom.
 */


// Core dependencies, components
var React = require('react');
var {Portal} = require('react-overlays');
var columnZoom = require('../columnZoom');

// Styles
var compStyles = require('./ZoomHelpTag.module.css');

// zoom text when user has pressed mouse down but has not yet moved the mouse
var defaultText = 'Drag to zoom';

// Return zoom text when user is currently executing a horizontal zoom
var geneZoomText = (annotationPct) => {
	return `Zoom to ${annotationPct < 1 ? `< 1` : annotationPct}%`;
};

// Return zoom text when user is currently executing a vertical zoom
var sampleZoomText = (prefix, zoomTo) => {
	var sampleRowFrom = zoomTo.index + 1,
		sampleRowTo = zoomTo.index + zoomTo.count;
	return zoomTo.count === 1 ? `${prefix} row ${sampleRowFrom}` : `${prefix} rows ${sampleRowFrom} - ${sampleRowTo}`;
};

class ZoomHelpTag extends React.Component {
	render() {
		var {column, selection, picking} = this.props;
		if (selection) {
			var {crosshair, direction, offset, overlay, zone, zoomTo} = selection,
				{fieldType} = column,
				zoomToLength = columnZoom.zoomToLength({fieldType, zoomTo}),
				geneZoomPct = Math.round(zoomToLength / columnZoom.maxGeneZoomLength(column) * 100),
				annotationZoom = direction === 'h',
				noZoom = overlay.sstart === overlay.send,
				tagInstruction =
					picking ? sampleZoomText('Picking', zoomTo) :
					noZoom ? defaultText :
					annotationZoom ? geneZoomText(geneZoomPct) :
					sampleZoomText('Zoom to', zoomTo),
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
