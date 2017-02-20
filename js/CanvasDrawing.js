// React component to manages redrawing a canvas element. Additionally
// provides a vertical zoom animation based on zoom & sample list props.

/*global require: false, document: false, module: false */
'use strict';

var _ = require('./underscore_ext');
var vgcanvas = require('./vgcanvas');
var React = require('react');
var ReactDOM = require('react-dom');
var transitionEnd = require('./transitionEnd');

var styles = {
	canvas: {
		position: 'relative',
		left: 0,
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
				<canvas style={{...styles.canvas, top: 0}} ref='canvas1'/>
				<canvas style={{...styles.canvas, top: -height}} ref='canvas2'/>
			</div>
		);
	},
	componentDidMount: function () {
		var {width, zoom: {height}} = this.props;
		this.vg = [
			vgcanvas(ReactDOM.findDOMNode(this.refs.canvas1), width, height),
			vgcanvas(ReactDOM.findDOMNode(this.refs.canvas2), width, height)];
		this.draw(this.props);
	},

	// XXX We've drop the transition feature. Should drop all this code, too, but don't have
	// time to do it now. See bc7f1297 for the original commit of transition. The detailed
	// bit will be ensure that the css is still correct wrt resize overlay, etc.
	// For now, just setting this flag to 'true' so we can never transition.
	transitioning: true,
	onTransitionEnd: function () {
		let vg0 = this.vg[0].element(),
			vg1 = this.vg[1].element();
		vg0.style.transition = 'opacity 0.2s linear';
		vg1.style.transition = 'opacity 0.2s linear 0.2s';
		vg0.style.opacity = 1;
		vg1.style.opacity = 0;
		this.transitioning = false;
		vg1.removeEventListener(transitionEnd, this.onTransitionEnd);
	},
	canTransition: function () {
		return transitionEnd && !this.transitioning;
	},
	setHeight: function (height) {
		this.vg[0].height(height);
		this.vg[1].height(height);
		this.refs.canvas2.style.top = `${-height}px`;
		this.refs.div.style.height = `${height}px`;
	},
	setWidth: function (width) {
		this.vg[0].width(width);
		this.vg[1].width(width);
		this.refs.div.style.width = `${width}px`;
	},
	draw: function (props) {
		var {draw, ...drawProps} = props,
			{zoom, samples, width} = drawProps,
			{index, count, height} = zoom, oldZoom = this.props.zoom;

		// This is a bit fiddly, but we want to animate zoom on samples.
		// That means 1) the sample list hasn't changed, 2 the height hasn't
		// changed, 3) the count or index has changed.
		if (this.canTransition() && count > 0 && _.isEqual(samples, this.props.samples) &&
				height === _.getIn(this.props, ['zoom', 'height']) &&
				(count !== _.getIn(this.props, ['zoom', 'count']) ||
				 index !== _.getIn(this.props, ['zoom', 'index']))) {

			this.vg.reverse();
			let scaleY = oldZoom.count / count,
				translateY = (oldZoom.index - index) * height / count,
				vg0 = this.vg[0].element(),
				vg1 = this.vg[1].element();


			// Prepare to draw into vg0. Set opaque & move to front.
			vg0.style.transition = '';
			vg0.style.transform = '';
			vg0.style.zIndex = 2;
			vg0.style.opacity = 0;

			// Reset transition to clear bad state.
			vg1.style.transition = '';

			// Set transition state
			vg1.style.transition =  'transform 0.5s linear';
			vg1.style.transformOrigin = 'top left';
			vg1.style.transform = `translateY(${translateY}px) scaleY(${scaleY})`;
			vg1.style.zIndex = 1;

			vg1.addEventListener(transitionEnd, this.onTransitionEnd);
			this.transitioning = true;
		}

		var vg = this.vg[0];

		// We should not be transitioning if width is changing, so no
		// need to worry about interrupting the effect.
		if (vg.width() !== width) {
			this.setWidth(width);
		}

		// have to update position, too, so they overlap.
		if (vg.height() !== height) {
			this.setHeight(height);
		}

		draw(vg, drawProps);
	}
});

module.exports = CanvasDrawing;
