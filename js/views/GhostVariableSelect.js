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


// Core dependencies, components
import {Box, Typography} from '@material-ui/core';
var React = require('react');

// App dependencies
var CardAvatar = require('./CardAvatar');
import {xenaColor} from '../xenaColor';

// Styles
var sxGhostCard = {
	border: `1px dashed ${xenaColor.BLACK_38}`,
	minHeight: 645, /* Must specify minimum height to maintain identical heights across cohort/disease and variable selects during wizard setup. Dupe of WizardCard. */
};
var sxGhostHeader = {
	borderBottom: `1px dashed ${xenaColor.BLACK_12}`,
	padding: 16,
};
var sxGhostTitle = {
	...sxGhostHeader,
	alignItems: 'center',
	color: xenaColor.BLACK_38,
	display: 'flex',
	height: 61,
};

class GhostVariableSelect extends React.Component {
	render() {
		var {title, width} = this.props;
		return (
			<Box sx={{...sxGhostCard, width: width}}>
				<Box sx={sxGhostHeader}>
					<CardAvatar/>
				</Box>
				<Box
					component={Typography}
					sx={sxGhostTitle}
					variant='caption'>{title}</Box>
			</Box>
		);
	}
}

module.exports = GhostVariableSelect;
