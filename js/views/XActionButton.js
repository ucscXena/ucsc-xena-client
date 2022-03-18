/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena action button, providing custom "text" button styles to the Mui ButtonBase component.
 */

// Core dependencies, components
import {Box, ButtonBase, makeStyles} from '@material-ui/core';
import React from 'react';
import {xenaColor} from '../xenaColor';

const useStyles = makeStyles(theme => ({
	root: sx => ({
		...theme.typography.caption,
		...sx,
		color: xenaColor.ACCENT,
		'&:disabled': {
			color: theme.palette.action.disabled,
		},
	}),
}));

export default function XActionButton({children, onClick, sx, ...props}) {
	const classes = useStyles(sx);
	return (
		<Box
			component={ButtonBase}
			classes={{root: classes.root}}
			disableRipple
			onClick={onClick}
			{...props}>
			{children}
		</Box>
	);
};
