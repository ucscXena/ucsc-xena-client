/*globals require: false, module: false */
'use strict';
var React = require('react');
var Sortable = require('../views/Sortable');

function makeSortable(Component) {
	return React.createClass({
		displayName: 'SpreadsheetSortable',
		render() {
			var {onClick, onReorder, children, ...otherProps} = this.props;
			return (
				<Component {...otherProps}>
					<Sortable onClick={onClick} onReorder={onReorder}>
						{children}
					</Sortable>
				</Component>);
		}
	});
}

module.exports = makeSortable;
