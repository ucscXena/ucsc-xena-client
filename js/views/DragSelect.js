'use strict';

var React = require('react');
//var ReactDOM = require('react-dom');
var Rx = require('rx');
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

var clip = (min, max, x) => x < min ? min : (x > max ? max : x);

function targetXPos(target, ev) {
	var bb = target.getBoundingClientRect();
	return ev.clientX - bb.left;
}

var DragSelect = React.createClass({
	getDefaultProps() {
		return {enabled: true};
	},
	componentWillMount() {
		var mousedown = new Rx.Subject();
		var mousedrag = mousedown.selectMany((down) => {
			var target = down.currentTarget,
				bb = target.getBoundingClientRect(),
				start = targetXPos(target, down),
				selection;

			return Rx.DOM.fromEvent(window, 'mousemove').map(function (mm) {
				selection = {start, end: clip(0, bb.width - 1, targetXPos(target, mm))};
				return {dragging: true, ...selection};
			}).takeUntil(Rx.DOM.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => Rx.Observable.return({selection})));
		});
		this.subscription = mousedrag.subscribe(ev => {
			if (ev.selection) {
				this.props.onSelect && this.props.onSelect(ev.selection);
				this.setState({dragging: false});
			} else {
				this.setState(ev);
			}
		});
		this.dragStart = ev => this.props.enabled && mousedown.onNext(ev);
	},
	componentWillUnmount () {
		this.subscription.dispose();
	},
	getInitialState () {
		return {dragging: false};
	},
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
				<div style={_.merge(styles.overlay, ostyle)}/>
				{this.props.children}
			</div>);
	}
});

module.exports = DragSelect;
