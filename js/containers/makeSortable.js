'use strict';
var React = require('react');
var Sortable = require('../views/Sortable');
var {deepPureRenderMixin} = require('../react-utils');

// We skip the first column to keep 'samples' on the left.
function makeSortable(Component) {
	return React.createClass({
		displayName: 'SpreadsheetSortable',
		mixins: [deepPureRenderMixin],
		onReorder: function (order) {
			this.props.callback(['order', order]);
		},
		onDragging(dragging) {
			this.props.onInteractive('drag', !dragging);
		},
		render() {
			var {children, ...otherProps} = this.props,
				widths = this.props.appState.columnOrder.map(id =>
					this.props.appState.columns[id].width);
			return (
				<Sortable
					widths={widths}
					{...otherProps}
					Component={Component}
					onDragging={this.onDragging}
					onReorder={this.onReorder}>

					{children}
				</Sortable>);
		}
	});
}

module.exports = makeSortable;
