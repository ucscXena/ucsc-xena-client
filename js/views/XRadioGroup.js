/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena radio group, with UI/UX based on Material Design's full-width inputs. This is a light wrapper component
 * around React Toolbox's RadioGroup and RadioButton components.
 *
 *
 */

'use strict';

// Core dependencies, components
var React = require('react');
var XRadioMeta = require('./XRadioMeta');
import {RadioGroup, RadioButton} from 'react-toolbox/lib/radio';
var _ = require('../underscore_ext');

// Styles
var compStyles = require('./XRadioGroup.module.css');

var XRadioGroup = React.createClass({
	onChange: function (value) {
		this.props.onChange(value);
	},
	render() {
		var {additionalAction, label, options, value} = this.props;
		return (
			<div className={compStyles.XRadioGroup}>
				<div className={compStyles.toolbar}>
					<span className={compStyles.label}>{label}</span>
					{additionalAction ? <span className={compStyles.additionalAction}>{additionalAction}</span> :
						null}
				</div>
				<RadioGroup value={value} onChange={this.onChange}>
					{_.map(options, o => [<RadioButton label={o.label} value={o.value}/>, o.meta ? <XRadioMeta meta={o.meta}/> : null])}
				</RadioGroup>
			</div>
		);
	}
});

module.exports = XRadioGroup;
