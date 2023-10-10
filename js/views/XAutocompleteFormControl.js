/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena autocomplete form control component, providing custom control to the autocomplete input field.
 */

// Core dependencies, components
import {Box, FormHelperText} from '@material-ui/core';
import React from 'react';

// App dependencies
import XFormLabel from './XFormLabel';

// Styles
var sxFormHelperText = {
	'&.MuiFormHelperText-root': {
		marginBottom: 8,
		whiteSpace: 'normal',
	}
};

export default function XAutocompleteFormControl({children, formLabel, helperText}) {
	return (
		<Box>
			{formLabel && <Box component={XFormLabel} label={formLabel} sx={{display: 'block', marginBottom: 4}}/>}
			{helperText && <Box component={FormHelperText} error sx={sxFormHelperText}>{helperText}</Box>}
			{children}
		</Box>
	);
};
