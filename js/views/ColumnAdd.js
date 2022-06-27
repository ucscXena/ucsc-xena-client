/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Column add component, displayed between column cards and after last column card. Used as click handler for inserting
 * or adding new card.
 *
 * State
 * -----
 * actionKey - Index of add column.
 * height - Height of add column component.
 * last - True if add column is after the last visualization column.
 *
 * Actions
 * -------
 * onClick - called on click of component.
 * onHover - called on mouse over and mouse out on component.
 */


// Core dependencies, components
var React = require('react');
import {Box, Typography} from '@material-ui/core';
var classNames = require('classnames');
import {xenaColor} from '../xenaColor';

// Styles
var compStyles = require('./ColumnAdd.module.css');

class ColumnAdd extends React.Component {
	onClick = () => {
		this.props.onClick(this.props.actionKey);
	};

	onMouseOut = () => {
		var {last, onHover, actionKey} = this.props;
		if ( !last ) {
			onHover(actionKey, false);
		}
	};

	onMouseOver = () => {
		var {last, onHover, actionKey} = this.props;
		if ( !last ) {
			onHover(actionKey, true);
		}
	};

	render() {
		var {show, last} = this.props;
		return (
			<div className={classNames(compStyles.ColumnAdd, {[compStyles.last]: last && show})}
				 style={{visibility: show ? 'visible' : 'hidden'}}
				onClick={this.onClick}
				onMouseOut={this.onMouseOut}
				onMouseOver={this.onMouseOver}>
				<Box component={Typography} className={compStyles.text} color={xenaColor.BLACK_38} variant='caption'>
					Click to {last ? 'Add' : 'Insert'} Column
				</Box>
			</div>
		);
	}
}

module.exports = ColumnAdd;
