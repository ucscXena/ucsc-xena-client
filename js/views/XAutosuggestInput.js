/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena autosuggest input field, providing custom styles to the Mui TextField component for the Xena autosuggest.
 */

// Core dependencies, components
import {Box, Icon, InputAdornment, TextField} from '@material-ui/core';
import React from 'react';

// Styles
const sxInput = {
	'& .MuiFormHelperText-root.Mui-error': {
		bottom: 6,
		left: 16,
		position: 'absolute',
	},
	'& .MuiInput-formControl': {
		marginTop: 0,
	},
	'& .MuiInputAdornment-positionEnd': {
		margin: 0,
		position: 'absolute',
		right: 16,
	},
	'& .MuiInputBase-input': {
		boxSizing: 'border-box',
		height: 77, /* Allows input field access to full height of its container - to improve clickable area */
		padding: '20px 56px 20px 16px', /* 56px RHS to allow for close (X) icon */
	},
	'& .MuiInputLabel-formControl': {
		left: 16,
	},
	'& .MuiInputLabel-shrink': {
		transform: 'translate(0, 6px) scale(0.75)',
	},
};

function renderErrorIcon(error) {
	if (error) {
		return (
			<InputAdornment disablePointerEvents position='end'>
				<Icon color='error'>error</Icon>
			</InputAdornment>
		);
	}
}

export default function XAutosuggestInput({...props}) {
	return (
		<Box
			component={TextField}
			sx={sxInput}
			{...props}
			InputProps={{endAdornment: renderErrorIcon(props.error)}}
		/>
	);
};
