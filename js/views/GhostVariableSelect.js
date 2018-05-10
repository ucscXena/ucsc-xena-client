/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena ghost variable select card, displaying during wizard setup.
 *
 * State
 * -----
 * title - Text displayed as title.
 * width - Width of card.
 */

'use strict';

// Core dependencies, components
var React = require('react');

// App dependencies
var CardAvatar = require('./CardAvatar');

// Styles
var compStyles = require('./GhostVariableSelect.module.css');

class GhostVariableSelect extends React.Component {
	render() {
		var {title, width} = this.props;
		return (
			<div className={compStyles.GhostVariableSelect} style={{width: width}}>
				<div className={compStyles.headerContainer}>
					<CardAvatar/>
				</div>
				<div className={compStyles.title}>{title}</div>
			</div>
		);
	}
}

module.exports = GhostVariableSelect;
