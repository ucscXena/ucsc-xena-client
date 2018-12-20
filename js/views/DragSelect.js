'use strict';

var React = require('react');
//var ReactDOM = require('react-dom');
var Rx = require('../rx');
var _ = require('../underscore_ext');

var styles = {
	wrapper: {
		position: 'relative',
	}
};


var clip = (min, max, x) => x < min ? min : (x > max ? max : x);

function crosshairXPos(target, ev, width) {
	var bb = target.getBoundingClientRect();
	return clip(bb.left, bb.left + width - 1, ev.clientX);
}

function crosshairYPos(target, ev, height) {
	var bb = target.getBoundingClientRect();
	return clip(bb.left, bb.left + height - 1, ev.clientY);
}

function targetXPos(target, ev, width) {
	var bb = target.getBoundingClientRect();
	return clip(0, width - 1, ev.clientX - bb.left);
}

function targetYPos(target, ev, height) {
	var bb = target.getBoundingClientRect();
	return clip(0, height - 1, ev.clientY - bb.top);
}

// Browsers give us coordinates that aren't always within the element. We
// would expect coords [0, width - 1] to indicate which pixel the mouse is over,
// but sometimes get coords outside that range.
//
// We clip start and end to [0, width - 1].
class DragSelect extends React.Component {
	static defaultProps = {enabled: true};

	componentWillMount() {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.flatMap((down) => {
			var target = down.currentTarget,
				bb = target.getBoundingClientRect(),
				startX = targetXPos(target, down, bb.width),
				startY = targetYPos(target, down, bb.height),
				selection;

			return Rx.Observable.fromEvent(window, 'mousemove').map(function (mm) {
				var {width, height} = bb,
					endX = targetXPos(target, mm, width),
					endY = targetYPos(target, mm, height),
					crosshairX = crosshairXPos(target, mm, width),
					crosshairY = crosshairYPos(target, mm, height);

				selection = {
					start: {x: startX, y: startY},
					end: {x: endX, y: endY},
					offset: {x: bb.left, y: bb.top},
					crosshair: {x: crosshairX, y: crosshairY}
				};
				return {dragging: true, ...selection};
			}).takeUntil(Rx.Observable.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => Rx.Observable.of({selection})));
		});
		this.subscription = mousedrag.subscribe(ev => {
			var {dragging, ...selection} = ev;
			if (dragging) {
				this.props.onDrag && this.props.onDrag(selection);
			}
			if (ev.selection) {
				this.props.onSelect && this.props.onSelect(ev.selection);
			}
		});
		this.dragStart = ev => this.props.enabled && mousedown.next(ev);
	}

	componentWillUnmount() {
		this.subscription.unsubscribe();
	}

	render() {
		var containerProps = _.omit(this.props, 'onSelect', 'enabled');
		return (
			<div {...containerProps} style={styles.wrapper} onMouseDown={this.dragStart}>
				{this.props.children}
			</div>);
	}
}

module.exports = DragSelect;
