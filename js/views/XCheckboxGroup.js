/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Standard Xena checkbox group, with UI/UX based on Material Design's full-width inputs. This component simply wraps
 * the children props.
 *
 * Children should be in the format:
 * <XInputToolbar>
 * <Checkbox>
 * <Checkbox>
 * etc
 */

'use strict';

// Core dependencies, components
var React = require('react');

// Styles
var compStyles = require('./XCheckboxGroupTheme.module.css');

var XCheckboxGroup = React.createClass({
	render() {
		var {children} = this.props;
		return (
			<div className={compStyles.XCheckboxGroup}>
				{children}
			</div>
		);
	}
});

module.exports = XCheckboxGroup;
