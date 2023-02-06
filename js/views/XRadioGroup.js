/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena radio group, with UI/UX based on Material Design's full-width inputs.
 *
 * State
 * -----
 * label - radio group field name.
 * additionalAction - display text of additional action.
 * options - array of radio options in format {label, value, meta: [{label, value}]}
 *
 * Actions
 * -------
 * onAdditionalAction - called when additional action link is clicked.
 * onChange - called when selected radio value is changed.
 */


// Core dependencies, components
import {FormControlLabel, Radio, RadioGroup} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
import XFormControl from './XFormControl';
var XRadioMeta = require('./XRadioMeta');
var XInputToolbar = require('./XInputToolbar');

class XRadioGroup extends React.Component {
	onChange = (event) => {
		this.props.onChange(event.target.value);
	};

	render() {
		var {additionalAction, label, onAdditionalAction, options, value} = this.props;
		return (
			<XFormControl>
				<XInputToolbar label={label} additionalAction={additionalAction} onAdditionalAction={onAdditionalAction}/>
				<RadioGroup onChange={this.onChange} value={value}>
					{_.map(options, (o, i) => [
						<FormControlLabel
							key={`${o.label}${i}`}
							control={<Radio />}
							label={o.label}
							value={o.value}/>,
						o.meta ? <XRadioMeta key={i} meta={o.meta}/> : null])}
				</RadioGroup>
			</XFormControl>
		);
	}
}

module.exports = XRadioGroup;
