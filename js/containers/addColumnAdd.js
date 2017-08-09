/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Structural component, giving each column a sibling "add column" component.
 */

'use strict';

// Core dependencies, components
var React = require('react');
var {deepPureRenderMixin} = require('../react-utils');
var ColumnAdd = require('../views/ColumnAdd');

// XXX move layout to a view, after we know what the final layout will be.
function addColumnAdd(Component) {
	return React.createClass({
		displayName: 'SpreadsheetColumnAdd',
		mixins: [deepPureRenderMixin],
		render() {
			var {children, onAddColumn, ...otherProps} = this.props,
				{appState: {editing, wizardMode}} = otherProps,
				columns = editing ? children : React.Children.map(this.props.children, (child, i) => (
					<div style={{display: 'flex'}} actionKey={child.props.actionKey}>
						{child}
						{wizardMode ? null : <ColumnAdd onClick={() => onAddColumn(i)}/>}
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
