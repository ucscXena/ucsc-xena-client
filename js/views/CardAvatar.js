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

var CardAvatar = React.createClass({
	render() {
		var {colId} = this.props,
			ghost = !colId;
		return (
			<div className={classNames(compStyles.avatar, {[compStyles.ghost]: ghost})}>{colId}</div>
		);
	}
});
module.exports = CardAvatar;
