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
 * colMode - Mode of column (eg 'DEFAULT', 'GHOST', 'WIZARD').
 */


// Core dependencies, components
var React = require('react');
import {Box} from '@material-ui/core';
import {xenaColor} from '../xenaColor';

// Styles
var sxDefaultAvatar = {
	alignItems: 'center',
	backgroundColor: xenaColor.GRAY_AVATAR,
	borderRadius: '50%',
	display: 'flex',
	fontSize: 18,
	fontWeight: 500,
	height: 40,
	justifyContent: 'center',
	lineHeight: 40,
	minWidth: 40, /* Required to maintain avatar shape. */
	width: 40,
};
var sxGhostAvatar = {
	...sxDefaultAvatar,
	backgroundColor: 'transparent',
	border: `1px dashed ${xenaColor.GRAY_DARK}`,
	color: xenaColor.BLACK_54,
};
var sxWizardAvatar = {
	...sxDefaultAvatar,
	backgroundColor: xenaColor.ACCENT,
	color: xenaColor.WHITE,
};
const AVATAR_SX = {
	DEFAULT: sxDefaultAvatar,
	GHOST: sxGhostAvatar,
	WIZARD: sxWizardAvatar,
};

class CardAvatar extends React.Component {
	render() {
		var {colId, colMode = 'DEFAULT'} = this.props;
		return (
			<Box sx={AVATAR_SX[colMode]}>{colId}</Box>
		);
	}
}

module.exports = CardAvatar;
