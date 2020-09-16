var React = require('react');
var Rx = require('../rx').default;
var _ = require('../underscore_ext').default;

var styles = {
	wrapper: {
		position: 'relative',
	}
};

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);

function crosshairPos(target, ev) {
	var {width, height, left, top} = target.getBoundingClientRect();
	return {
		x: clip(left, left + width - 1, ev.clientX),
		y: clip(top, top + height - 1, ev.clientY)};
}

function targetPos(target, ev) {
	var {width, height, left, top} = target.getBoundingClientRect();
	return {
		x: clip(0, width - 1, ev.clientX - left),
		y: clip(0, height - 1, ev.clientY - top)};
}

function getSelection(target, ev, start) {
	var {left, top} = target.getBoundingClientRect(),
		end = targetPos(target, ev),
		crosshair = crosshairPos(target, ev);

	return {
		start,
		end,
		offset: {x: left, y: top},
		crosshair
	};
}

// Browsers give us coordinates that aren't always within the element. We
// would expect coords [0, width - 1] to indicate which pixel the mouse is over,
// but sometimes get coords outside that range.
//
// We clip start and end to [0, width - 1].
class DragSelect extends React.Component {
	// When allowClick is false we discard zero-length drags. If true
	// we will invoke onSelect with a zero-length selection.
	static defaultProps = {enabled: true, allowClick: false};

	componentWillMount() {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.flatMap((down) => {
			var target = down.currentTarget,
				start = targetPos(target, down),
				selection = this.props.allowClick ? getSelection(target, down, start) :
					undefined;

			return Rx.Observable.fromEvent(window, 'mousemove').map(function (mm) {
				selection = getSelection(target, mm, start);
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
		var containerProps = _.omit(this.props, 'onSelect', 'enabled', 'allowClick');
		return (
			<div {...containerProps} style={styles.wrapper} onMouseDown={this.dragStart}>
				{this.props.children}
			</div>);
	}
}

module.exports = DragSelect;
