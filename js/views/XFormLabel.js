/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena form label, displayed above radio group or checkbox group.
 */


// Core dependencies, components
import {Box, FormLabel} from '@material-ui/core';
var React = require('react');

// App dependencies
import {xenaColor} from '../xenaColor';

// Styles
var sxXFormLabel = {
	'&&': {
		color: xenaColor.BLACK_87,
		fontSize: 14,
		fontWeight: 600, // Mimics Roboto font weight 500 specification.
		letterSpacing: 'normal',
		lineHeight: '20px',
		'&.Mui-focused': {
			color: xenaColor.BLACK_87,
		},
	}
};

class XFormLabel extends React.Component {
	render() {
		var {className, label} = this.props;
		return (
			<Box className={className} component={FormLabel} sx={sxXFormLabel}>{label}</Box>
		);
	}
}

module.exports = XFormLabel;

