/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Structural component, giving each column a sibling "add column" component.
 */


// Core dependencies, components
import PureComponent from '../PureComponent';
import React from 'react';
import classNames from 'classnames';
import ColumnAdd from '../views/ColumnAdd.js';

// Styles
import compStyles from "./addColumnAdd.module.css";

var hoverClass = (index, hover) =>
	index === hover ? compStyles.hoverLeft :
		(index - 1 === hover ? compStyles.hoverRight : undefined);

// XXX move layout to a view, after we know what the final layout will be.
function addColumnAdd(Component) {
	return class extends PureComponent {
	    static displayName = 'SpreadsheetColumnAdd';
	    state = {hover: null};

	    onClick = (index) => {
			this.props.onAddColumn(index);
			this.setState({hover: null});
		};

	    onHover = (index, hovering) => {

	    	if ( index === 0 ) {
	    		this.props.callback(['enableTransition', true]);
				this.props.callback(['addColumnAddHover', hovering]);
			}

			this.setState({hover: hovering ? index : null});
		};

		render() {
			var {children, ...otherProps} = this.props,
				{appState: {wizardMode}, interactive} = otherProps,
				{hover} = this.state,
				lastIndex = children.length - 1,
				columns = React.Children.map(children, (child, i) => (
					<div
						className={classNames(compStyles[wizardMode ? 'wizardMode' : 'visualizationMode'], hoverClass(i, hover))}
						data-actionkey={child.props.actionKey}>

						{child}
						{!wizardMode && <ColumnAdd
							show={interactive}
							actionKey={i}
							last={i === lastIndex}
							onHover={this.onHover}
							onClick={this.onClick}/>}
					</div>));
			return (
				<Component {...otherProps}>
					{columns}
				</Component>);
		}
	};
}

export default addColumnAdd;
