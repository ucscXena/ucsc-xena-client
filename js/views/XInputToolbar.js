/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena input toolbar, displayed above radio group or checkbox group. Displays input field name and optionally,
 * an additional action with corresponding click handler.
 *
 * State
 * -----
 * - Label
 * - Additional Action
 *
 * Actions
 * -------
 * - onAdditionalAction
 */


// Core dependencies, components
import {Box, Typography} from '@material-ui/core';
var React = require('react');
import XActionButton from './XActionButton';

class XInputGroup extends React.Component {
	onAdditionalAction = (value) => {
		this.props.onAdditionalAction(value);
	};

	render() {
		var {additionalAction, label} = this.props;
		return (
			<Box display='flex' justifyContent='space-between'>
				{label ? <Box component={Typography} color='text.hint' variant='caption'>{label}</Box> : null}
				{additionalAction ? <XActionButton onClick={this.onAdditionalAction}>{additionalAction}</XActionButton> :
					null}
			</Box>
		);
	}
}

module.exports = XInputGroup;

