/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Overlay displayed on mousedown and drag of gene or samples zoom.
 */

// TODO freeze addColumn hover while mouse down
// TODO method mouseDown - do not want to render overlay if shift click - confirm ok
// TODO clear previous DOM render of overlay between mouseDown events
// TODO bugfix for sample only spreadsheet - vertical zoom after attempt for horizontal zoom
// TODO need for zones to be set up to restrict render of overlay when user not in that zone

'use strict';

// Core dependencies, components
var React = require('react');
var {Portal} = require('react-overlays');

// Styles
var compStyles = require('./ZoomOverlay.module.css');
var classNames = require('classnames');

class ZoomOverlay extends React.Component {

	state = {dragging: false, y: -1, y1: -1};

	onMouseDown = (ev) => {

		var zoomOutClick = ev => ev.shiftKey;

		if (!zoomOutClick(ev)) {
			this.setState({dragging: true, y1: ev.clientY});
		}
	};

	onMouseMove = (ev) => {

		this.setState({y: ev.clientY});
	}

	onMouseUp = () => {
		this.setState({dragging: false, y: -1, y1: -1});
	};

	render() {
		var {dragging, y, y1} = this.state,
		{selection, pxStart, pxEnd, samplesOffset} = this.props,
		{children} = this.props,
		height = selection ? (selection.end - selection.start) : 0,
		left = selection ? selection.start : -1,
		width = selection ? (selection.end - selection.start) : 0,
		top = (y > y1) ? y1 : y;
		console.log(selection, pxStart, pxEnd, samplesOffset, y1, top);
		return (
			<div className={compStyles.ZoomOverlay} onMouseDown={this.onMouseDown} onMouseUp={this.onMouseUp} onMouseMove={this.onMouseMove}>
				{children}
				{dragging && selection ? selection.direction === 'v' ?
					<Portal container={document.body}>
						<div className={classNames(compStyles.overlay, compStyles.overlayV)} style={{height: height, top: top}}/>
					</Portal> :
					<div className={classNames(compStyles.overlay, compStyles.overlayH)} style={{left: left, width: width}}/> : null}
			</div>
		);
	}
}

module.exports = ZoomOverlay;
