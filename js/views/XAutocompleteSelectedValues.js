/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena autocomplete selected values component.
 */

// Core dependencies, components
import {Box, Chip, Icon} from '@material-ui/core';
import React from 'react';

// Styles
var sxSelectedValues = {
	display: 'flex',
	flexWrap: 'wrap',
	gap: 8,
	justifyContent: 'flex-start',
	minWidth: 0,
};

export default function XAutocompleteSelectedValues({onDelete, selectedValues}) {
	return (
		selectedValues.length > 0 ?
			<Box sx={sxSelectedValues}>
				{selectedValues.map(({label, value}, i) =>
					<Chip
						key={`${value}${i}`}
						deleteIcon={<Icon>close</Icon>}
						label={label}
						onClick={(ev) => onDelete(ev, value)}
						onDelete={(ev) => onDelete(ev, value)}/>)}
			</Box> : null
	);
}
