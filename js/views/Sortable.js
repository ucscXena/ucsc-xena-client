/*globals require: false, module: false, window: false */
'use strict';

// Horizontal sortable widget, with Rx and React.
//
// <Sortable setOrder={this.setOrder}>
// 	{map(order, id => child[id]}
// </Sortable>
//
// Children must set class Sortable-handle on their drag handle. Children
// must have keys.
//
// The setOrder callback is invoked when a sort is completed, and
// should re-render the component with the childen in the new order.

var React = require('react');
var ReactDOM = require('react-dom');
var Rx = require('rx');
var _ = require('../underscore_ext');
require('./Sortable.css');

function leftWidth(rect) {
	return {
		left: rect.left,
		width: rect.right - rect.left
	};
}

function hasClass(el, c) {
    return el.className.split(/ +/).indexOf(c) !== -1;
}

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

var Sortable = React.createClass({
	componentWillMount: function () {
		var mousedownSub = new Rx.Subject();
		var mousedown = mousedownSub.filter(([, md]) => hasClass(md.target, 'Sortable-handle'));
		var mousedrag = mousedown.selectMany(([id, md]) => {
            // find starting positions on mouse down

			var order = _.map(this.props.children, c => c.props.actionKey);
			var startX = md.clientX;
			var positions = _.map(order,
								  id => leftWidth(ReactDOM.findDOMNode(this.refs[id]).getBoundingClientRect()));
			var N = positions.length;
			var index = _.indexOf(order, id);
			var target = positions[index];
			var max = positions[N - 1].left - target.left - target.width + positions[N - 1].width;
			var min = positions[0].left - target.left;
			var newPos = _.map(positions, () => 0);

			// Calculate delta with mousemove until mouseup
			return Rx.DOM.fromEvent(window, 'mousemove').map(function (mm) {
				mm.preventDefault();

				var shift, edge;
				var dragLeft = mm.clientX - startX;

				dragLeft = dragLeft < min ? min : (dragLeft > max ? max : dragLeft);

				if (dragLeft < 0) {              // dragging left
					shift = target.left - positions[index - 1].left -
						(positions[index - 1].width - target.width);
					edge = target.left + dragLeft;
					newPos = _.map(_.first(positions, index),
								   ({left, width}) => edge < left + width / 2 ? shift : 0)
						.concat([dragLeft],
							_.map(_.range(N - 1 - index), () => 0));
				}  else if (dragLeft > 0) {      // dragging right
					shift = target.left - positions[index + 1].left;
					edge = target.left + dragLeft + target.width;
					newPos = _.map(_.range(index), () => 0)
						.concat([dragLeft],
							_.map(_.last(positions, N - 1 - index),
								  ({left, width}) => edge >= left + width / 2 ? shift : 0));
				}

				return _.object(order, newPos);
			}).takeUntil(Rx.DOM.fromEvent(window, 'mouseup'))
			.concat(Rx.Observable.defer(() => { // Send a re-order event on mouse-up.
				var indexOrder = _.range(order.length)
						.sort((i, j) => positions[i].left + newPos[i] > positions[j].left + newPos[j] ? 1 : -1),
					newOrder = _.map(indexOrder, i => order[i]);
				return Rx.Observable.return({order: newOrder});
			}));
		});

        // Update position
		this.subscription = mousedrag.subscribe(pos => {
			if (_.has(pos, 'order')) {
				this.props.onReorder(pos.order);
			} else {
				this.setState({pos: pos});
			}
        });

		this.sortStart = ev => mousedownSub.onNext(ev);
	},

	initialPositions () {
		return _.object(_.map(this.props.children, c => [c.props.actionKey, 0]));

	},

	getInitialState: function () {
		return {pos: this.initialPositions()};
	},

	componentWillReceiveProps: function () {
		this.setState({pos: this.initialPositions()});
	},

	componentWillUnmount: function () {
		this.subscription.dispose();
	},

	render: function () {
		var columns = React.Children.map(this.props.children, child =>
							<td
								{...this.props}
								onMouseDown={ev => this.sortStart([child.props.actionKey, ev])}
								className='Sortable-container'
								style={{left: this.state.pos[child.props.actionKey]}}
								ref={child.props.actionKey}>

								{child}
							</td>);

		return (
			<table className="Sortable">
				<tbody>
					<tr>
						{columns}
					</tr>
				</tbody>
			</table>
		);
    }
});

module.exports = Sortable;
