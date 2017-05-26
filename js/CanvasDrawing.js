// React component to manages redrawing a canvas element.

'use strict';

var _ = require('./underscore_ext');
var vgmixed = require('./vgmixed');
var React = require('react');
var ReactDOM = require('react-dom');

var styles = {
	canvas: {
		position: 'relative',
		left: 0,
		top: 0,
		zIndex: 1
	},
	labels: {
		position: 'relative',
		left: 0,
		zIndex: 2
	},
	wrapper: {
		position: 'relative',
		zIndex: 1,
		overflow: 'hidden',
		backgroundColor: 'gray'
	}
};

var CanvasDrawing = React.createClass({
	componentWillReceiveProps: function (newProps) {
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	},
	shouldComponentUpdate: () => false,
	render: function () {
		var {width, zoom: {height}, wrapperProps} = this.props;
		return (
			<div ref='div' {...wrapperProps} style={{...styles.wrapper, width, height}}>
				<canvas style={styles.canvas} ref='canvas'/>
				<div style={{...styles.labels, top: -height, width, height}} ref='labels'/>
			</div>
		);
	},
	componentDidMount: function () {
		var {width, zoom: {height}} = this.props;
		this.vg = vgmixed(ReactDOM.findDOMNode(this.refs.canvas), width, height, ReactDOM.findDOMNode(this.refs.labels));
		this.draw(this.props);
	},

	setHeight: function (height) {
		this.vg.height(height);
		this.refs.div.style.height = `${height}px`;
		this.refs.labels.style.height = `${height}px`;
		this.refs.labels.style.top = `-${height}px`;
	},
	setWidth: function (width) {
		this.vg.width(width);
		this.refs.div.style.width = `${width}px`;
		this.refs.labels.style.width = `${width}px`;
	},
	draw: function (props) {
		var {draw, ...drawProps} = props,
			{zoom, width} = drawProps,
			{height} = zoom,
			vg = this.vg;

		if (vg.width() !== width) {
			this.setWidth(width);
		}

		if (vg.height() !== height) {
			this.setHeight(height);
		}

		draw(vg, drawProps);
	}
});

module.exports = CanvasDrawing;
