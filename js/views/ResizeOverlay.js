'use strict';

var React = require('react');
var Resizable = require('react-resizable').Resizable;

// Styles
require('./ResizeOverlay.css');

var max = (x, y) => x > y ? x : y;
var minWidthSize = (minWidth, {width, height}) => ({width: max(minWidth, width), height});

var ResizeOverlay = React.createClass({
	getInitialState: () => ({zooming: false}),
	onResizeStart: function () {
		var {width, height} = this.props,
			minWidth = this.props.minWidth();
		this.setState({zooming: true, zoomSize: {width, height}, minWidth});
	},
	onResize: function (ev, {size}) {
		var {width, height} = size,
			{minWidth} = this.state;
		this.setState({zoomSize: {width: max(width, minWidth), height}});
	},
	onResizeStop: function (ev, {size}) {
		var {onResizeStop} = this.props,
			{minWidth} = this.state;
		this.setState({zooming: false});
		if (onResizeStop) {
			onResizeStop(minWidthSize(minWidth, size));
		}
	},
	render: function () {
		var {zooming, zoomSize} = this.state;
		// XXX This margin setting really belongs elsewhere.
		return (
			<div className='resizeOverlay' style={{position: 'relative'}}>
				{zooming ? <div style={{
					width: zoomSize.width,
					height: zoomSize.height,
					position: 'absolute',
					top: 0,
					left: 0,
					zIndex: 999,
					backgroundColor: 'rgba(0, 0, 0, 0.12)'
				}} /> : null}
				<Resizable handleSize={[20, 20]}
					onResizeStop={this.onResizeStop}
					onResize={this.onResize}
					onResizeStart={this.onResizeStart}
					width={this.props.width}
					height={this.props.height}>

					<div style={{position: 'relative', cursor: 'none', zIndex: 0}}>
						{this.props.children}
					</div>
				</Resizable>
			</div>
		);
	}
});

module.exports = ResizeOverlay;
