/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena typography component extending Mui Typography with custom typography variants.
 * Returns Mui Box component with the custom variant defined as a class, and any other Box props including all the style functions.
 * Based off https://github.com/mui/material-ui/issues/22257#issuecomment-776300833.
 * An upgrade to Mui v5.x will deprecate this component (where Mui Theme supports custom typography variants).
 */

// Core dependencies, components
import classNames from 'classnames';
import {Box, withStyles} from '@material-ui/core';
import React from 'react';

export const XTypographyVariants = {
	MD_HEADLINE: 'mdHeadline',
	XENA_TEXT_BUTTON: 'xenaTextButton',
};

const style = () => ({
	[XTypographyVariants.MD_HEADLINE]: {
		fontSize: '24px',
		fontWeight: 400,
		lineHeight: '32px',
	},
	[XTypographyVariants.XENA_TEXT_BUTTON]: {
		fontSize: 12,
		letterSpacing: '0.75px',
		lineHeight: '16px',
	}
});

function isCustomVariant(classes, variant) {
	return Object.keys(classes).indexOf(variant) > -1;
}

const XTypography = ({children, classes, className, variant, ...props}) => {
	const custom = isCustomVariant(classes, variant);
	Object.assign(props, {className: classNames(className, classes[variant])});
	return (
		custom ? <Box {...props}>{children}</Box> : null
	);
};

export default withStyles(style)(XTypography);
