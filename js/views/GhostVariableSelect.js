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
import React from 'react';

// App dependencies
import CardAvatar from './CardAvatar.js';

import { WIZARD_CARD_MAX_HEIGHT } from './WizardCard.js';
import {xenaColor} from '../xenaColor';

// Styles
var sxGhostCard = {
	border: `1px dashed ${xenaColor.GRAY_DARK}`,
	borderRadius: 6,
	minHeight: WIZARD_CARD_MAX_HEIGHT, /* Must specify minimum height to maintain identical heights across cohort/disease and variable selects during wizard setup. Dupe of WizardCard. */
};
var sxGhostHeader = {
	alignItems: 'center',
	borderBottom: `1px dashed ${xenaColor.GRAY_DARK}`,
	display: 'flex',
	gap: 16,
	padding: 16,
};
var sxGhostTitle = {
	color: xenaColor.BLACK_54,
	letterSpacing: 'normal !important',
	margin: 0,
};

class GhostVariableSelect extends React.Component {
	render() {
		var {colId, title, width} = this.props;
		return (
			<Box sx={{...sxGhostCard, width: width}}>
				<Box sx={sxGhostHeader}>
					<CardAvatar colId={colId} colMode={'GHOST'}/>
					<Box
						component={Typography}
						sx={sxGhostTitle}
						variant='subtitle2'>{title}</Box>
				</Box>
			</Box>
		);
	}
}

export default GhostVariableSelect;
