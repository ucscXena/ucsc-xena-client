/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Avatar displayed at top of wizard, col (visualization) and ghost cards. If ID is specified, avatar is shaded with
 * with grey background, otherwise avatar is displayed hollow with a dashed border.
 *
 * State
 * -----
 * colId - ID of column (eg 'A', 'B').
 */

'use strict';

// Core dependencies, components
var React = require('react');
var classNames = require('classnames');

// Styles
var compStyles = require('./CardAvatar.module.css');

class CardAvatar extends React.Component {
	render() {
		var {colId, zoomCard} = this.props,
			ghost = !colId,
			noAvatar = zoomCard;
		return (
			<div className={classNames({[compStyles.avatar]: !noAvatar}, {[compStyles.ghost]: ghost}, {[compStyles.noAvatar]: noAvatar})}>{colId}</div>
		);
	}
}

module.exports = CardAvatar;
