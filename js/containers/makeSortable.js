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
		render() {
			var {children, ...otherProps} = this.props;
			return (
				<Sortable {...otherProps} Component={Component} onReorder={this.onReorder}>
					{children}
				</Sortable>);
		}
	});
}

module.exports = makeSortable;
