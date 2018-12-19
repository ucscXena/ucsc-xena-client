/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Overlay displayed on mousedown and drag over gene or samples zoom.
 */

// TODO freeze addColumn hover while mouse down
// TODO method mouseDown - do not want to render overlay if shift click - confirm ok

'use strict';

// Core dependencies, components
var React = require('react');
var {Portal} = require('react-overlays');

// Styles
var compStyles = require('./ZoomOverlay.module.css');

// Overlay for horizontal drag.
var OverlayHorizontal = props => {
	var {geneHeight, height, positionHeight, selection} = props,
		{connectors, end, start} = selection,
		twoDivs = (53 + 69),
		probPosTop = (twoDivs + (geneHeight - positionHeight)),
		probPosBottom = (probPosTop + positionHeight - 2),
		bottomPos = (twoDivs + geneHeight + height),
		polygonPoints = connectors.start !== undefined ? `${connectors.start},0 ${connectors.end},0 ${connectors.end},${probPosTop} ${end},${probPosBottom} ${end},${bottomPos} ${start},${bottomPos} ${start},${probPosBottom} ${connectors.start},${probPosTop} ${connectors.start},0` : `${start},0 ${end},0 ${end},${bottomPos} ${start},${bottomPos} ${start},0`;

	return (
		<div>
			<svg className={compStyles.overlayH}>
				<polygon points={polygonPoints}/>
			</svg>
		</div>
	);
};

// Overlay for vertical drag.
var OverlayVertical = props => {
	var {selection} = props,
		{end, offset, start} = selection,
		length = end - start,
		top = offset.y + start;

	return (
		<Portal container={document.body}>
			<div className={compStyles.overlayV} style={{height: length, top: top}}/>
		</Portal>
	);
};

class ZoomOverlay extends React.Component {
	render() {
		var {children, ...overlayProps} = this.props,
			Overlay = (overlayProps.selection ? overlayProps.selection.direction === 'h' ? OverlayHorizontal : OverlayVertical : null);
		return (
			<div className={compStyles.ZoomOverlay}>
				{children}
				{overlayProps.selection ? <Overlay {...overlayProps}>{children}</Overlay> : null}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
