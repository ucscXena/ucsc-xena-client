
var React = require('react');
var _ = require('./underscore_ext').default;
var vgcanvas = require('./vgcanvas');

var tickWidth = 5,
	borderWidth = 5;

var style = {
	position: 'absolute',
	background: 'transparent',
	left: - (tickWidth + borderWidth),
	top: - borderWidth,
	pointerEvents: 'none',
	zIndex: 2,
	borderWidth,
	borderColor: 'transparent',
	borderStyle: 'solid',
	transition: 'border-color 0.3s linear'
};

// singleton img data
var highlightImg = _.memoize1((width, height, samplesMatched, samples) => {
	var img = new Uint32Array(width * height);
	img.fill(0xFFFFFFFF);
	if (samplesMatched) {
		let matches = [];
		for (let i = 0; i < samplesMatched.length; ++i) {
			matches[samplesMatched[i]] = 1;
		}
		let count = samples.length,
			rows = new Array(height);
		for (let i = 0; i < samples.length; ++i) {
			if (matches[samples[i]]) {
				rows.fill(1, i * height / count, (i + 1) * height / count + 1);
			}
		}
		for (let i = 0; i < height; ++i) {
			if (rows[i]) {
				img.fill(0xFF000000, width * i, width * (i + 1));
			}
		}
	}
	return new ImageData(new Uint8ClampedArray(img.buffer), width);
});

class SpreadSheetHighlight extends React.Component {
	state = {animate: false};

	shouldComponentUpdate(nextProps, nextState) {
		// ignore props.
		return !_.isEqual(this.state, nextState);
	}

	componentDidMount() {
		var {height} = this.props;
		this.vg = vgcanvas(this.refs.canvas, tickWidth, height);
		this.draw(this.props);
		this.animate = this.props.animate.subscribe(ev => this.setState({animate: ev})); //eslint-disable-line react/no-did-mount-set-state
	}

	componentWillUnmount() {
		this.animate.unsubscribe();
	}

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	}

	draw = (props) => {
		var {samples, samplesMatched, height, width} = props,
			{vg} = this;

		if (vg.height() !== height) {
			vg.height(height);
		}

		var ctx = vg.context();
		var img = highlightImg(width, height, samplesMatched, samples);
		ctx.putImageData(img, 0, 0);
	};

	render() {
		var {animate} = this.state,
			border = animate ? {
				borderColor: 'red',
			} : {};
		return <canvas style={{...style, ...border}} ref='canvas' />;
	}
}

module.exports = SpreadSheetHighlight;
