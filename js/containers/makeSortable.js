'use strict';
var React = require('react');
var Sortable = require('../views/Sortable');
var {deepPureRenderMixin} = require('../react-utils');

// We skip the first column to keep 'samples' on the left.
function makeSortable(Component) {
	return React.createClass({
		displayName: 'SpreadsheetSortable',
		mixins: [deepPureRenderMixin],
		render() {
			var {onClick, onReorder, children, ...otherProps} = this.props,
				[first, ...rest] = React.Children.toArray(children);
			return (
				<Component {...otherProps}>
					<div onClick={onClick}>
						{first}
					</div>
					<Sortable onClick={onClick} onReorder={order => onReorder([first.props.actionKey, ...order])}>
						{rest}
					</Sortable>
				</Component>);
		}
	});
}

module.exports = makeSortable;
