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

'use strict';

// Core dependencies, components
var React = require('react');

// Styles
var compStyles = require('./XInputToolbar.module.css');

class XInputGroup extends React.Component {
	onAdditionalAction = (value) => {
		this.props.onAdditionalAction(value);
	};

	render() {
		var {additionalAction, label} = this.props;
		return (
			<div className={compStyles.toolbar}>
				{label ? <span className={compStyles.label}>{label}</span> :
					null}
				{additionalAction ? <span className={compStyles.additionalAction}
										  onClick={this.onAdditionalAction}>{additionalAction}</span> :
					null}
			</div>
		);
	}
}

module.exports = XInputGroup;

