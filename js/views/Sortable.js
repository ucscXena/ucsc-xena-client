'use strict';

// Horizontal sortable widget, with Rx and React.
//
// <Sortable Component={Component} onReorder={this.onReorder}>
// 	{map(order, id => child[id]}
// </Sortable>
//
// Children must set class Sortable-handle on their drag handle. Children
// must have keys.
//
// The setOrder callback is invoked when a sort is completed, and
// should re-render the component with the childen in the new order.

var React = require('react');
var createReactClass = require('create-react-class');
var ReactDOM = require('react-dom');
var Rx = require('../rx');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
require('./Sortable.css');

var skip = 1; // Don't allow sort of <skip> elements on the left

function leftWidth(rect, width) {
	return {
		left: rect.left,
		width
	};
}

function hasClass(el, c) {
    return el.className.split(/ +/).indexOf(c) !== -1;
}

function repeat(n, v) {
	var arr = new Array(n);
	for (var i = 0; i < n; ++i) {
		arr[i] = v;
	}
	return arr;
}

var zeros = n => repeat(n, 0);


// If right edge crosses middle of next element, move next element to left.
// If left edge crosses middle of prev element, move prev element to right.
//
// Each element only moves as much as the width of the dragged element,
// and only moves if the dragged edge has crossed the midpoint of the element.
//
// left1             left2
// |   width1   |    |   width2  |
//
// Dragging left1 to the right
// We cross the midpoint when left1 + offset1 + width1 >= left2 + width2 / 2.
// At that point, we set offset2 to left1 - left2.
//
// Dragging left2 to the left
// We cross the midpoint when left2 + offset2 <= left1 + width1 / 2.
// At that point, we set offset1 to left2 - left1.

var transitionLength = 400;
var Sortable = createReactClass({
	mixins: [deepPureRenderMixin],
	componentWillMount: function () {
		var mousedownSub = new Rx.Subject();
		var mousedown = mousedownSub.filter(([, md]) => hasClass(md.target, 'Sortable-handle'));
		var mousedrag = mousedown.flatMap(([id, md]) => {
            // find starting positions on mouse down

			var order = _.map(this.props.children, c => c.props.actionKey);
			var startX = md.clientX;
			var {widths} = this.props;
			var positions = _.map(order,
								  (id, i) => leftWidth(ReactDOM.findDOMNode(this.refs[id]).getBoundingClientRect(), widths[i]));
			var N = positions.length;
			var index = _.indexOf(order, id);
			var target = positions[index];
			var max = positions[N - 1].left - target.left - target.width + positions[N - 1].width;
			var min = positions[skip].left - target.left;
			var newPos = zeros(N);
			var finalPos;

			// Calculate delta with mousemove until mouseup
			return Rx.Observable.fromEvent(window, 'mousemove').map(function (mm) {
				mm.preventDefault();

				var shift, edge, finalEl;
				var dragLeft = mm.clientX - startX;

				dragLeft = dragLeft < min ? min : (dragLeft > max ? max : dragLeft);

				if (dragLeft < 0) {              // dragging left
					shift = target.left - positions[index - 1].left -
						(positions[index - 1].width - target.width);
					edge = target.left + dragLeft;
					finalEl = _.findIndexDefault(positions, ({left, width}) => edge < left + width / 2, 0);
					newPos = [...zeros(finalEl), ...repeat(index - finalEl, shift), dragLeft, ...zeros(N - index - 1)],
					finalPos = positions[finalEl].left - target.left;
				}  else if (dragLeft > 0) {      // dragging right
					shift = target.left - positions[index + 1].left;
					edge = target.left + dragLeft + target.width;
					finalEl = _.findLastIndexDefault(positions,
								   ({left, width}) => edge >= left + width / 2, index);
					newPos = [...zeros(index), dragLeft, ...repeat(finalEl - index, shift), ...zeros(N - finalEl - 1)];
					finalPos = positions[finalEl].left - target.left + positions[finalEl].width - target.width;
				}

				return {pos: _.object(order, newPos), dragging: index};
			}).takeUntil(Rx.Observable.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => { // Send a re-order event on mouse-up.
				var finalNewPos = _.assoc(newPos, index, finalPos),
					indexOrder = _.range(order.length)
						.sort((i, j) => (positions[i].left + finalNewPos[i]) - (positions[j].left + finalNewPos[j])),
					newOrder = _.map(indexOrder, i => order[i]);
				if (_.isEqual(order, newOrder)) {
					// dragging -1 enables slide transition on all elements.
					return Rx.Observable.of({dragging: -1, pos: _.object(order, zeros(N))})
						.concat(Rx.Observable.of({dragging: null}).delay(transitionLength));
				} else {
					return Rx.Observable.of({dragging: -1, pos: _.object(order, finalNewPos)})
						.concat(Rx.Observable.of({dragging: null, order: newOrder}).delay(transitionLength));
				}
			}));
		});

        // Update position
		this.subscription = mousedrag.subscribe(ev => {
			if (_.has(ev, 'order')) {
				this.props.onReorder(ev.order);
			}
			this.setState(_.pick(ev, 'pos', 'dragging'));
			this.props.onDragging(!!ev.dragging);
        });

		this.sortStart = ev => mousedownSub.next(ev);
	},

	initialPositions () {
		return _.object(_.map(this.props.children, c => [c.props.actionKey, 0]));

	},

	getInitialState: function () {
		return {pos: this.initialPositions(), dragging: null};
	},

	componentWillReceiveProps: function () {
		this.setState({pos: this.initialPositions()});
	},

	componentWillUnmount: function () {
		this.subscription.unsubscribe();
	},

	render: function () {
		var {dragging} = this.state,
			{Component, children, ...otherProps} = this.props;

		var columns = React.Children.map(children, (child, i) =>
			React.cloneElement(child, {
				onMouseDown: i < skip ? undefined : ev => this.sortStart([child.props.actionKey, ev]),
				className: 'Sortable-container' + (dragging !== null && i !== dragging ? ' Sortable-slide' : ''),
				style: {left: this.state.pos[child.props.actionKey]},
				id: child.props.actionKey,
				ref: child.props.actionKey
			}));

		return (
			<Component {...otherProps} className='Sortable'>
				{columns}
			</Component>
		);
    }
});

module.exports = Sortable;
