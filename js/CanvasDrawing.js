// React component to manages redrawing a canvas element.


import * as _ from './underscore_ext.js';

import vgmixed from './vgmixed.js';
import React from 'react';
import ReactDOM from 'react-dom';

// Styles
import compStyles from "./CanvasDrawing.module.css";

import classNames from 'classnames';

class CanvasDrawing extends React.Component {
	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	}

	shouldComponentUpdate() {
		return false;
	}

	render() {
		var {width, zoom: {height}, wrapperProps} = this.props,
			{className, ...props} = wrapperProps || {},
			classes = classNames(className, compStyles.wrapper); // Must add tooltip class, if specified in props
		return (
			<div ref='div' {...props} className={classes} style={{width, height}}>
				<canvas className={compStyles.canvas} ref='canvas'/>
				<div className={compStyles.labels} style={{top: -height, width, height}} ref='labels'/>
			</div>
		);
	}

	componentDidMount() {
		var {width, zoom: {height}} = this.props;
		this.vg = vgmixed(ReactDOM.findDOMNode(this.refs.canvas), width, height, ReactDOM.findDOMNode(this.refs.labels));
		this.draw(this.props);
	}

	setHeight = (height) => {
		this.vg.height(height);
		this.refs.div.style.height = `${height}px`;
		this.refs.labels.style.height = `${height}px`;
		this.refs.labels.style.top = `-${height}px`;
	};

	setWidth = (width) => {
		this.vg.width(width);
		this.refs.div.style.width = `${width}px`;
		this.refs.labels.style.width = `${width}px`;
	};

	draw = (props) => {
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
	};
}

export default CanvasDrawing;
