/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena checkbox group, with UI/UX based on Material Design's full-width inputs. This is a light wrapper
 * component around React Toolbox's Checkbox (applies custom class name for styling checkbox group).
 *
 * State
 * -----
 * label - checkbox group field name.
 * additionalAction - display text of additional action.
 * options - array of checkbox option objects in format, {label?, options: [{label, value}]}. If top-level label is
 *           specified, nested options array is grouped under that label (for advanced view functionality).
 *
 * Actions
 * -------
 * onAdditionalAction - called when additional action link is clicked.
 * onChange - called when a checkbox value is changed.
 */

'use strict';

// Core dependencies, components
var React = require('react');
import {Checkbox} from 'react-toolbox/lib/checkbox';
var _ = require('../underscore_ext');
var XInputToolbar = require('./XInputToolbar');
var {deepPureRenderMixin} = require('../react-utils');

// Styles
var compStyles = require('./XCheckboxGroup.module.css');

var XCheckboxGroup = React.createClass({
	mixins: [deepPureRenderMixin],
	onChange: function (isOn, ev) {
		var value = ev.target.dataset.value;
		this.props.onChange(value, isOn);
	},
	render() {
		var {additionalAction, label, onAdditionalAction, options} = this.props;
		return (
			<div className={compStyles.XCheckboxGroup}>
				<XInputToolbar label={label} additionalAction={additionalAction} onAdditionalAction={onAdditionalAction}/>
				{_.map(options, group => [
					group.label ? <span className={compStyles.subgroupHeader}>{group.label}</span> : null,
					_.map(group.options, o => <span><Checkbox data-value={o.value} key={o.label} label={o.label} checked={o.checked} onChange={this.onChange}/></span>)
				])}
			</div>
		);
	}
});

module.exports = XCheckboxGroup;
