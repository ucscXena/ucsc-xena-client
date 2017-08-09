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

var hoverClass = (index, hover) =>
	index === hover ? 'hover-left' :
		(index - 1 === hover ? 'hover-right' : undefined);

// XXX move layout to a view, after we know what the final layout will be.
function addColumnAdd(Component) {
	return React.createClass({
		displayName: 'SpreadsheetColumnAdd',
		mixins: [deepPureRenderMixin],
		getInitialState() {
			return {hover: null};
		},
		onHover(index, hovering) {
			var {hover} = this.state;
			// I don't trust in/out events to arrive in order, so only
			// reset state if it matches the current index.
			if (hovering) {
				this.setState({hover: index});
			} else if (hover === index) {
				this.setState({hover: null});
			}
		},
		render() {
			var {children, onAddColumn, ...otherProps} = this.props,
				{appState: {editing, wizardMode}} = otherProps,
				{hover} = this.state,
				columns = editing ? children : React.Children.map(this.props.children, (child, i) => (
					<div style={{display: 'flex'}} className={hoverClass(i, hover)}  actionKey={child.props.actionKey}>
						{child}
						{wizardMode ? null : <ColumnAdd actionKey={i} onHover={this.onHover} onClick={() => onAddColumn(i)}/>}
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
