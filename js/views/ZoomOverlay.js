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
var classNames = require('classnames');

class ZoomOverlay extends React.Component {
	render() {
		var {selection, children} = this.props,
			direction, length, left, top;
		if ( selection ) {
			var {start, end, offset} = selection;
			({direction} = selection),
			length = end - start,
			left = start,
			top = offset.y + start;
		}
		return (
			<div className={compStyles.ZoomOverlay}>
				{children}
				{selection ? direction === 'v' ?
					<Portal container={document.body}>
						<div className={classNames(compStyles.overlay, compStyles.overlayV)} style={{height: length, top: top}}/>
					</Portal> :
					<div className={classNames(compStyles.overlay, compStyles.overlayH)} style={{left: left, width: length}}/> : null}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
