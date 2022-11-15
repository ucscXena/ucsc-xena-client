/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena form control, providing custom styles to Mui FormControl component for XCheckboxGroup and XRadioGroup.
 */

// Core dependencies, components
import {FormControl, makeStyles} from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles({
	root: {
		padding: '24px 16px',
	},
});

export default function XFormControl({children, ...props}) {
	const classes = useStyles();
	return (
		<FormControl classes={{root: classes.root}} fullWidth {...props}>{children}</FormControl>
	);
};

