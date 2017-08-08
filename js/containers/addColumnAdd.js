'use strict';
var React = require('react');
var {deepPureRenderMixin} = require('../react-utils');

// XXX move layout to a view, after we know what the final layout will be.
function addColumnAdd(Component) {
	return React.createClass({
		displayName: 'SpreadsheetColumnAdd',
		mixins: [deepPureRenderMixin],
		render() {
			var {children, onAddColumn, ...otherProps} = this.props,
		   		{appState: {editing}} = otherProps,
				columns = editing ? children : React.Children.map(this.props.children, (child, i) => (
					<div style={{display: 'flex'}} actionKey={child.props.actionKey}>
						{child}
						<span style={{width: 16, textAlign: 'center'}} onClick={() => onAddColumn(i)}>+</span>
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
