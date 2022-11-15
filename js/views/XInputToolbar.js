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
import {Box} from '@material-ui/core';
var React = require('react');
import XActionButton from './XActionButton';
import XFormLabel from './XFormLabel';

class XInputGroup extends React.Component {
	onAdditionalAction = (value) => {
		this.props.onAdditionalAction(value);
	};

	render() {
		var {additionalAction, label} = this.props;
		return (
			<Box display='flex' justifyContent='space-between' mb={0.5}>
				{label && <XFormLabel label={label}/>}
				{additionalAction ? <XActionButton onClick={this.onAdditionalAction}>{additionalAction}</XActionButton> :
					null}
			</Box>
		);
	}
}

module.exports = XInputGroup;

