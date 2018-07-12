'use strict';
import PureComponent from '../PureComponent';
var React = require('react');
var Sortable = require('../views/Sortable');
var gaEvents = require('../gaEvents');

// We skip the first column to keep 'samples' on the left.
function makeSortable(Component) {
	return class extends PureComponent {
	    static displayName = 'SpreadsheetSortable';

	    onReorder = (order) => {
			gaEvents('spreadsheet', 'reorder');
			this.props.callback(['order', order]);
		};

	    onDragging = (dragging) => {
			this.props.onInteractive('drag', !dragging);
		};

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
	};
}

module.exports = makeSortable;
