
var React = require('react');
var Resizable = require('react-resizable').Resizable;
var _ = require('../underscore_ext').default;

// Styles
require('./ResizeOverlay.css');

var max = (x, y) => x > y ? x : y;
var minWidthSize = (minWidth, {width, height}) => ({width: max(minWidth, width), height});

class ResizeOverlay extends React.Component {
	state = {zooming: false};

	onResizeStart = () => {
		var {width, height} = this.props,
			minWidth = this.props.minWidth();
		this.setState({zooming: true, zoomSize: {width, height}, minWidth});
	};

	onResize = (ev, {size}) => {
		var {width, height} = size,
			{minWidth} = this.state;
		this.setState({zoomSize: {width: max(width, minWidth), height}});
	};

	onResizeStop = (ev, {size}) => {
		var {onResizeStop} = this.props,
			{minWidth} = this.state;
		this.setState({zooming: false});
		if (onResizeStop) {
			onResizeStop(minWidthSize(minWidth, size));
		}
	};

	render() {
		var {zooming, zoomSize} = this.state,
			{width, height, children, enable} = this.props,
			content = (
				<div style={{position: 'relative', cursor: 'none', zIndex: 0}}>
					{children}
				</div>);
		return (
			<div className={enable ? 'resize-enable' : ''} style={{position: 'relative'}}>
				<div style={{
					display: zooming ? 'block' : 'none',
					width: _.get(zoomSize, 'width', 0),
					height: _.get(zoomSize, 'height', 0),
					position: 'absolute',
					top: 0,
					left: 0,
					zIndex: 999,
					backgroundColor: 'rgba(0, 0, 0, 0.12)'}} />
				<Resizable handleSize={[20, 20]}
					axis={'both'}
					onResizeStop={this.onResizeStop}
					onResize={this.onResize}
					onResizeStart={this.onResizeStart}
					width={width}
					height={height}>

					{content}
				</Resizable>
			</div>
		);
	}
}

module.exports = ResizeOverlay;
