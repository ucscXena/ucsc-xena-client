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
				{appState: {wizardMode, zoom}, interactive} = otherProps,
				{hover} = this.state,
				height = zoom.height + 170, // zoom + 170 = height of col cards TODO revisit - brittle
				lastIndex = children.length - 1,
				columns = React.Children.map(children, (child, i) => (
					<div
						className={classNames(compStyles.visualizationOrWizardMode, hoverClass(i, hover), {[compStyles.wizardModeMargins]: wizardMode})}
						actionKey={child.props.actionKey}>

						{child}
						<ColumnAdd
							show={interactive}
							actionKey={i}
							height={height}
							last={i === lastIndex}
							onHover={this.onHover}
							onClick={() => this.onClick(i)}/>
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	});
}

module.exports = addColumnAdd;
