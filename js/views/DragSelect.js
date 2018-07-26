'use strict';

var React = require('react');
//var ReactDOM = require('react-dom');
var Rx = require('../rx');
var _ = require('../underscore_ext');

var styles = {
	wrapper: {
		position: 'relative',
	},
	overlay: {
		backgroundColor: 'rgba(128, 128, 128, 0.3)',
		position: 'absolute',
		pointerEvents: 'none'
	}
};

var min = (x, y) => x < y ? x : y;
var flop = (x, y) => x < y ? {start: x, end: y} : {start: y, end: x};

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);

function targetXPos(target, ev, width) {
	var bb = target.getBoundingClientRect();
	return clip(0, width - 1, ev.clientX - bb.left);
}

// Browsers give us coordinates that aren't always within the element. We
// would expect coords [0, width - 1] to indicate which pixel the mouse is over,
// but sometimes get coords outside that range.
//
// We clip start and end to [0, width - 1].
class DragSelect extends React.Component {
	static defaultProps = {enabled: true};
	state = {dragging: false};

	componentWillMount() {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.flatMap((down) => {
			var target = down.currentTarget,
				bb = target.getBoundingClientRect(),
				start = targetXPos(target, down, bb.width),
				selection;

			return Rx.Observable.fromEvent(window, 'mousemove').map(function (mm) {
				var end = targetXPos(target, mm, bb.width);

				selection = flop(start, end);
				return {dragging: true, ...selection};
			}).takeUntil(Rx.Observable.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => Rx.Observable.of({selection})));
		});
		this.subscription = mousedrag.subscribe(ev => {
			if (ev.selection) {
				this.props.onSelect && this.props.onSelect(ev.selection);
				this.setState({dragging: false});
			} else {
				this.setState(ev);
			}
		});
		this.dragStart = ev => this.props.enabled && mousedown.next(ev);
	}

	componentWillUnmount() {
		this.subscription.unsubscribe();
	}

	render() {
		var {dragging} = this.state,
			containerProps = _.omit(this.props, 'onSelect', 'enabled'),
			ostyle = dragging ? {
				display: 'block',
				top: 0,
				left: min(this.state.start, this.state.end),
				width: Math.abs(this.state.end - this.state.start),
				height: '100%'
			} : {display: 'none'};
		return (
			<div {...containerProps} style={styles.wrapper} onMouseDown={this.dragStart}>
				{this.props.children}
				<div style={_.merge(styles.overlay, ostyle)}/>
			</div>);
	}
}

module.exports = DragSelect;
