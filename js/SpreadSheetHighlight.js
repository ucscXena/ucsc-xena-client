/*globals require: false, module: false */
'use strict';

var React = require('react');
var _ = require('./underscore_ext');
var vgcanvas = require('./vgcanvas');
var transitionEnd = require('./transitionEnd');

// XXX Also in drawMutations. Move to underscore_ext?
// Group by consecutive matches, perserving order.
function groupByConsec(sortedArray, prop, ctx) {
	var cb = _.iteratee(prop, ctx);
	var last = {}, current; // init 'last' with a sentinel, !== to everything
	return _.reduce(sortedArray, (acc, el) => {
		var key = cb(el);
		if (key !== last) {
			current = [];
			last = key;
			acc.push(current);
		}
		current.push(el);
		return acc;
	}, []);
}

var border = 5;
var style = {
	position: 'absolute',
	background: 'transparent',
	top: -5,
	left: -5,
	pointerEvents: 'none',
	zIndex: 2
};

/*global console: false */
var SpreadSheetHighlight = React.createClass({
	shouldComponentUpdate: () => false,
	componentDidMount: function () {
		var {width, height} = this.props;
		console.log('cdm', width, height);
		this.vg = vgcanvas(this.refs.canvas, width + 2 * border, height + 2 * border);
		this.draw(this.props);
	},
	componentWillReceiveProps: function (newProps) {
		console.log('wrp');
		if (this.vg && !_.isEqual(newProps, this.props)) {
			this.draw(newProps);
		}
	},
	draw: function (props) {
		var {samples, samplesMatched, height, width} = props,
			{vg} = this;

		if (vg.width() !== width + 2 * border) {
			vg.width(width + 2 * border);
		}

		if (vg.height() !== height + 2 * border) {
			vg.height(height + 2 * border);
		}

		vg.clear(0, 0, width + 2 * border, height + 2 * border);
		if (!samplesMatched) {
			return;
		}
		var matchMap = _.object(samplesMatched, _.range(samplesMatched.length)),
			stripeGroups = groupByConsec(samples, s => _.has(matchMap, s)),
			stripes = _.scan(stripeGroups, (acc, g) => acc + g.length, 0),
			hasMatch = _.map(stripeGroups, (s, i) => _.has(matchMap, stripeGroups[i][0])),
			pixPerRow = height / samples.length;


		vg.box(0, 0, width + 2 * border, height + 2 * border, 'rgba(0, 0, 0, 0)'); // transparent black

//		var rects = _.flatmap(_.initial(stripes).map((offset, i) => (hasMatch[i] ? [] : [[
//			0, (offset * pixPerRow) + border,
//			width + 2 * border, pixPerRow * (stripes[i + 1] - offset)
//		]])));
		var rects = _.flatmap(_.initial(stripes).map((offset, i) => (!hasMatch[i] ? [] : [[
			0, (offset * pixPerRow) + border,
			border, Math.max(pixPerRow * (stripes[i + 1] - offset), 1)
		]])));
		console.log(`drawing ${rects.length} stripes`, rects);
		if (rects.length > 0) {
//			var top = [0, 0, width + 2 * border, border],
//				bottom = [0, height + border, width + 2 * border, border];
			vg.drawRectangles(rects /*[top, ...rects, bottom]*/, {fillStyle:  'rgba(0, 0, 0, 1)'});

			let vge = vg.element(), self = this;
			if (!this.transitioning) {
				console.log('starting');
				this.transitioning = true;
				vge.style.transition = 'transform 0.1s linear';
				vge.style.transformOrigin = 'top left';
				vge.style.transform = `scaleX(2)`;
				vge.addEventListener(transitionEnd, function expand() {
					vge.style.transition = 'transform 0.1s linear';
					vge.style.transform = `scaleX(1)`;
					vge.removeEventListener(transitionEnd, expand);
					vge.addEventListener(transitionEnd, function contract() {
						console.log('ending');
						vge.removeEventListener(transitionEnd, contract);
						self.transitioning = false;
					});
				});
			}
		}
	},
	render: function() {
		return <canvas style={{...style}} ref='canvas' />;
	}
});

module.exports = SpreadSheetHighlight;
