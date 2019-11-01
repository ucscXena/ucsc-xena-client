// React component to manages redrawing a canvas element.


var _ = require('./underscore_ext');
var vgcanvas = require('./vgcanvas');
var React = require('react');
var ReactDOM = require('react-dom');

// This is a quick hack to work around the very different styling requirements
// of BandLegend, vs. the other canvas elements we have. Here we never change
// the pixel buffer size, but manipulate the canvas css size to scale over
// resize. The main point of this is that the size of the canvas width is
// driven by the css, so we're not holding the final width when we draw.

class CanvasDrawing extends React.Component {
	componentWillReceiveProps(newProps) {
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	}

	shouldComponentUpdate() {
		return false;
	}

	render() {
		var {style} = this.props;
		return <canvas style={style} ref='canvas'/>;
	}

	componentDidMount() {
		var {width, zoom: {height}} = this.props;
		this.vg = vgcanvas(ReactDOM.findDOMNode(this.refs.canvas), width, height);
		this.draw(this.props);
	}

	setHeight = (height) => {
		this.vg.height(height);
	};

	setWidth = (width) => {
		this.vg.width(width);
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

module.exports = CanvasDrawing;
