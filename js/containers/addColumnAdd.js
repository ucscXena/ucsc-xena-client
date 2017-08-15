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
var classNames = require('classnames');
var ColumnAdd = require('../views/ColumnAdd');

// Styles
var compStyles = require('./addColumnAdd.module.css');

var hoverClass = (index, hover) =>
	index === hover ? compStyles.hoverLeft :
		(index - 1 === hover ? compStyles.hoverRight : undefined);

// XXX move layout to a view, after we know what the final layout will be.
function addColumnAdd(Component) {
	return React.createClass({
		displayName: 'SpreadsheetColumnAdd',
		mixins: [deepPureRenderMixin],
		getInitialState() {
			return {hover: null};
		},
		onClick(index) {
			this.props.onAddColumn(index);
			this.setState({hover: null});
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
			var {children, ...otherProps} = this.props,
				{appState: {editing, wizardMode}} = otherProps,
				{hover} = this.state,
				lastIndex = children.length - 1,
				columns = (editing != null) ? <div className={compStyles.ColumnWrap}>{children}</div>
					: React.Children.map(children, (child, i) => (
					<div className={classNames(compStyles.AddColumnWrap, hoverClass(i, hover))} actionKey={child.props.actionKey}>
						{child}
						{wizardMode ? null : <ColumnAdd actionKey={i}
														last={i === lastIndex}
														onHover={this.onHover}
														onClick={() => this.onClick(i)}/>}
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
