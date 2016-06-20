/*globals require: false, module: false */
'use strict';
var React = require('react');


function disableSelect(Component) {
	return React.createClass({
		displayName: 'SpreadsheetDisabledSelect',
		onMouseDown(ev) {
			// XXX XXX This is deeply evil, but not sure of a better way
			// to prevent the browser from selecting text every time
			// the user does shift-click. This will probably break other
			// form elements that are added.
			if (ev.target.tagName !== 'INPUT') {
				ev.preventDefault();
			}
		},
		render() {
			return <Component onMouseDown={this.onMouseDown} {...this.props}/>;
		}
	});
}

module.exports = disableSelect;
