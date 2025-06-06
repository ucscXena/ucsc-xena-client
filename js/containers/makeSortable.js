import PureComponent from '../PureComponent';
import React from 'react';
import Sortable from '../views/Sortable.js';
import gaEvents from '../gaEvents.js';

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

export default makeSortable;
