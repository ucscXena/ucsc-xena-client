/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Overlay displayed on mousedown and drag over gene or samples zoom.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var {Portal} = require('react-overlays');

// Styles
var compStyles = require('./ZoomOverlay.module.css');

// Overlay for horizontal drag.
var OverlayHorizontal = props => {
	var {geneHeight, height, positionHeight, selection} = props,
		{overlay} = selection,
		iEnd = overlay.iend,
		iStart = overlay.istart,
		sEnd = overlay.send,
		sStart = overlay.sstart,
		marginLength = 8,
		zoomTopPos = 0,
		zoomBottomPos = marginLength + geneHeight + height,
		probeBottomPos = zoomBottomPos - height - 2,
		probeTopPos = probeBottomPos - positionHeight + 2,
		polygonPoints = iStart !== null ? `${iStart},${zoomTopPos} ${iEnd},${zoomTopPos} ${iEnd},${probeTopPos} ${sEnd},${probeBottomPos} ${sEnd},${zoomBottomPos} ${sStart},${zoomBottomPos} ${sStart},${probeBottomPos} ${iStart},${probeTopPos} ${iStart},${zoomTopPos}` : `${sStart},${zoomTopPos} ${sEnd},${zoomTopPos} ${sEnd},${zoomBottomPos} ${sStart},${zoomBottomPos} ${sStart},${zoomTopPos}`;

	return (
		<div>
			<svg className={compStyles.overlayH} style={{height: (zoomBottomPos)}}>
				<polygon points={polygonPoints}/>
			</svg>
		</div>
	);
};

// Overlay for vertical drag.
var OverlayVertical = props => {
	var {selection} = props,
		{offset, overlay} = selection,
		length = overlay.send - overlay.sstart,
		top = offset.y + overlay.sstart;

	return (
		<Portal container={document.body}>
			<div className={compStyles.overlayV} style={{height: length, top: top}}/>
		</Portal>
	);
};

class ZoomOverlay extends React.Component {
	render() {
		var {children, ...overlayProps} = this.props,
			Overlay = (overlayProps.selection !== undefined ? overlayProps.selection.direction === 'h' ? OverlayHorizontal : OverlayVertical : null);
		return (
			<div className={compStyles.ZoomOverlay}>
				{children}
				{overlayProps.selection ? <Overlay {...overlayProps}>{children}</Overlay> : null}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
