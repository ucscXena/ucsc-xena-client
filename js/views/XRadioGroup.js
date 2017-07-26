/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena radio group, with UI/UX based on Material Design's full-width inputs. This is a light wrapper component
 * around React Toolbox's RadioGroup (applies custom class name for styling radio group) and then inserts children
 * props.
 *
 * Children should be in the format:
 * <XInputToolbar>
 * <RadioButton>
 * <RadioButton>
 * etc
 */

'use strict';

// Core dependencies, components
var React = require('react');
import {RadioGroup} from 'react-toolbox/lib/radio';

var XRadioGroup = React.createClass({
	render() {
		var {children, ...props} = this.props;
		return (
			<RadioGroup {...props}>
				{children}
			</RadioGroup>
		);
	}
});

module.exports = XRadioGroup;
