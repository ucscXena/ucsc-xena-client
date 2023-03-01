/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena column or wizard "card" divider, providing custom styles to the Mui Divider component.
 */

// Core dependencies, components
import {Box, Divider} from '@material-ui/core';
import React from 'react';
import {xenaColor} from '../xenaColor';

// Styles
var sxDivider = {
	'&&': {
		backgroundColor: xenaColor.GRAY_DARK,
	}
};

export default function XColumnDivider({className, ...props}) {
	return (
		<Box component={Divider} className={className} sx={sxDivider} {...props}/>
	);
};
