/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena radio group, with UI/UX based on Material Design's full-width inputs.
 *
 * State
 * -----
 * label - radio group field name.
 * options - array of radio options in format {label, value, meta: [{label, value}]}
 *
 * Actions
 * -------
 * onChange - called when selected radio value is changed.
 */


// Core dependencies, components
import {Box, FormControlLabel, Radio, RadioGroup} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
import XFormControl from './XFormControl';
import XFormLabel from './XFormLabel';
var XRadioMeta = require('./XRadioMeta');

class XRadioGroup extends React.Component {
	onChange = (event) => {
		this.props.onChange(event.target.value);
	};

	render() {
		var {label, options, value} = this.props;
		return (
			<XFormControl>
				{label && <Box component={XFormLabel} label={label} sx={{mb: 0.5}}/>}
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
