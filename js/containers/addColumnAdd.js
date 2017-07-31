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
					<div style={{display: 'inline-block'}} actionKey={child.props.actionKey}>
						<div style={{display: 'inline-block'}}>{child}</div>
						<p style={{display: 'inline-block'}} onClick={() => onAddColumn(i)}>+</p>
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
