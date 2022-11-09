/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena column or wizard "card" divider, providing custom styles to the Mui Divider component.
 */

// Core dependencies, components
import {Box, Divider, makeStyles} from '@material-ui/core';
import React from 'react';
import {xenaColor} from '../xenaColor';

const useStyles = makeStyles(() => ({
	root: () => ({
		backgroundColor: xenaColor.GRAY_DARK,
	}),
}));

export default function XColumnDivider({...props}) {
	const classes = useStyles();
	return (
		<Box component={Divider} classes={{root: classes.root}} {...props}/>
	);
};
