/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Column add component, displayed between column cards and after last column card. Used as click handler for inserting
 * or adding new card.
 *
 * Actions
 * -------
 * onClick - called on click of component.
 */

'use strict';

// Core dependencies, components
var React = require('react');

// Styles
var compStyles = require('./ColumnAdd.module.css');

var ColumnAdd = React.createClass({
	onClick: function () {
		this.props.onClick();
	},
	render() {
		return (
			<div className={compStyles.ColumnAdd} onClick={this.onClick}>
				<div className={compStyles.text}>
					Click to Add Column
				</div>
			</div>
		);
	}
});

module.exports = ColumnAdd;
