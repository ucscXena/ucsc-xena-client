/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Overlay displayed on mousedown and drag over gene or samples zoom.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var classNames = require('classnames');

// Styles
var compStyles = require('./ZoomOverlay.module.css');

class ZoomOverlay extends React.Component {
	render() {
		var {geneHeight, height, positionHeight, selection, children} = this.props;
		if (selection) {
			var {direction, offset, overlay} = selection,
				annotationZoom = direction === 'h' ? true : false,
				iEnd = overlay.iend,
				iStart = overlay.istart,
				sEnd = overlay.send,
				sStart = overlay.sstart,
				sEndSamples = sEnd + offset.y,
				sStartSamples = sStart + offset.y,
				iStartSamples = iStart ? iStart + offset.y : sStartSamples,
				iEndSamples = iEnd ? iEnd + offset.y : sEndSamples,
				posY1Annotation = 0,
				posY2Annotation = 8, // Gene top position
				posY5Annotation = posY2Annotation + geneHeight + height, // Spreadsheet bottom position
				posY4Annotation = posY5Annotation - height - 2, // Probe bottom position
				posY3Annotation = posY4Annotation - positionHeight + 2, // Probe top position
				posX1Samples = (iStartSamples === sStartSamples) && (iEndSamples === sEndSamples) ? 20 : 26, // Spreadsheet A left position
				posX2Samples = (iStartSamples === sStartSamples) && (iEndSamples === sEndSamples) ? posX1Samples : (posX1Samples + 12), // Spreadsheet A left position, zoom mode
				posX3Samples = window.innerWidth,
				polygonPoints = annotationZoom ? `${iStart},${posY1Annotation} ${iEnd},${posY1Annotation} ${iEnd},${posY3Annotation} ${sEnd},${posY4Annotation} ${sEnd},${posY5Annotation} ${sStart},${posY5Annotation} ${sStart},${posY4Annotation} ${iStart},${posY3Annotation} ${iStart},${posY1Annotation}` : `0,${iStartSamples} ${posX1Samples},${iStartSamples} ${posX2Samples},${sStartSamples} ${posX3Samples},${sStartSamples} ${posX3Samples},${sEndSamples} ${posX2Samples},${sEndSamples} ${posX1Samples},${iEndSamples} 0,${iEndSamples} 0,${sStartSamples}`;
		}
		return (
			<div className={compStyles.ZoomOverlay}>
				{children}
				{selection ? <svg
					className={classNames(compStyles.overlay, {[compStyles.overlayV]: !annotationZoom}, {[compStyles.overlayH]: annotationZoom})}
					style={{height: annotationZoom ? posY5Annotation : '100%'}}>
					<polygon points={polygonPoints}/>
				</svg> : null}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
