/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena autocomplete basic/advanced actions.
 */

// Core dependencies, components
import {Box} from '@material-ui/core';
import React from 'react';
import XColumnDivider from './XColumnDivider';
import XToggleButtonGroup from './XToggleButtonGroup';

export default function XAutocompleteActions({actions}) {
	return (
		actions ? <>
			<Box sx={{my: 2, padding: '8px 16px'}}>
				<XToggleButtonGroup toggleButtons={actions}/>
			</Box>
			<XColumnDivider/>
		</> : null
	);
}
