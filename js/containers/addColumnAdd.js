/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Structural component, giving each column a sibling "add column" component.
 */


// Core dependencies, components
import PureComponent from '../PureComponent';
var React = require('react');
var classNames = require('classnames');
var ColumnAdd = require('../views/ColumnAdd');

// Styles
var compStyles = require('./addColumnAdd.module.css');

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
						className={classNames(compStyles.visualizationOrWizardMode, hoverClass(i, hover))}
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

module.exports = addColumnAdd;
