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


// Core dependencies, components
var React = require('react');
import {Box} from '@material-ui/core';
import {xenaColor} from '../xenaColor';

// Styles
var compStyles = require('./CardAvatar.module.css');
var sxGhostAvatar = {
	border: `0.5px dashed ${xenaColor.BLACK_38}`,
};

class CardAvatar extends React.Component {
	render() {
		var {colId} = this.props,
			ghost = !colId;
		return (
			<Box
				className={compStyles.avatar}
				bgcolor={ghost ? 'transparent' : xenaColor.BLACK_6}
				sx={ghost ? sxGhostAvatar : undefined}>{colId}</Box>
		);
	}
}

module.exports = CardAvatar;
