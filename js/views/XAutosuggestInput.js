/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena autosuggest input field, providing custom styles to the Mui TextField component for the Xena autosuggest.
 */

// Core dependencies, components
import {Box, TextField} from '@material-ui/core';
import React from 'react';

// App dependencies
import XFormLabel from './XFormLabel';

export default function XAutosuggestInput({formLabel, ...props}) {
	return (
		<>
			{formLabel && <Box component={XFormLabel} label={formLabel} sx={{display: 'block', marginBottom: 4}}/>}
			<Box
				component={TextField}
				fullWidth
				inputProps={{spellCheck: false}}
				sx={{gridGap: 4}}
				variant='outlined'
				{...props}
			/>
		</>
	);
};
