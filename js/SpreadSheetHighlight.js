
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
		var {samples, samplesMatched, height} = props,
			{vg} = this;

		if (vg.height() !== height) {
			vg.height(height);
		}

		vg.clear(0, 0, tickWidth, height);
		if (!samplesMatched) {
			return;
		}
		// Previously we used _.object, but hit a Safari bug https://bugs.webkit.org/show_bug.cgi?id=177772
		// with assigning numeric values to numeric keys. So, using an Array instead.
		var matchMap = samplesMatched.reduce((acc, v, i) => { acc[v] = i; return acc; }, new Array(samples.length)),
			stripeGroups = _.groupByConsec(samples, s => _.has(matchMap, s)),
			stripes = _.scan(stripeGroups, (acc, g) => acc + g.length, 0),
			hasMatch = _.map(stripeGroups, (s, i) => _.has(matchMap, stripeGroups[i][0])),
			pixPerRow = height / samples.length;


		vg.box(0, 0, tickWidth, height, 'rgba(0, 0, 0, 0)'); // transparent black

		var rects = _.flatmap(_.initial(stripes).map((offset, i) => (!hasMatch[i] ? [] : [[
			0, offset * pixPerRow,
			tickWidth, Math.max(pixPerRow * (stripes[i + 1] - offset), 1)
		]])));
		if (rects.length > 0) {
			vg.drawRectangles(rects, {fillStyle: 'rgba(0, 0, 0, 1)'});
		}
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
