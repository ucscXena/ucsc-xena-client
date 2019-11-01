/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena radio group, with UI/UX based on Material Design's full-width inputs. This is a light wrapper component
 * around React Toolbox's RadioGroup (applies custom class name for styling radio group).
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
var React = require('react');
import {RadioButton, RadioGroup} from 'react-toolbox/lib/radio';
//import {RadioButton} from 'react-toolbox/lib/radio';
var _ = require('../underscore_ext');
var XRadioMeta = require('./XRadioMeta');
var XInputToolbar = require('./XInputToolbar');

// Styles
var compStyles = require('./XRadioGroup.module.css');

class XRadioGroup extends React.Component {
	onChange = (value) => {
		this.props.onChange(value);
	};

	render() {
		var {additionalAction, label, onAdditionalAction, options, value} = this.props;
		return (
			<div className={compStyles.XRadioGroup}>
				<XInputToolbar label={label} additionalAction={additionalAction} onAdditionalAction={onAdditionalAction}/>
				<RadioGroup value={value} onChange={this.onChange}>
					{_.map(options, o => [<RadioButton label={o.label} value={o.value}/>, o.meta ? <XRadioMeta meta={o.meta}/> : null])}
				</RadioGroup>
			</div>
		);
	}
}

module.exports = XRadioGroup;
