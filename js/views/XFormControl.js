/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena form control, providing custom styles to Mui FormControl component for XCheckboxGroup and XRadioGroup.
 */

// Core dependencies, components
import {FormControl} from '@material-ui/core';
import React from 'react';

export default function XFormControl({children, ...props}) {
	return (
		<FormControl fullWidth {...props}>{children}</FormControl>
	);
};

