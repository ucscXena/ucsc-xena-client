/*globals require: false, module: false */
'use strict';

/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

//const _ = require('./underscore_ext');
const React = require('react');
var Input = require('react-bootstrap/lib/Input');

var styles = {
	input: {
		defaultValue: {
			fontStyle: 'italic',
			color: '#666666'
		},
		user: {
		}
	}
};

var DefaultTextInput = React.createClass({
	resetIfNull: function () {
		var {callback, dsID, eventName, value: {'default': defaultValue}} = this.props,
			val = this.refs.input.getValue();

		if (val === "") {
			callback([eventName, dsID, defaultValue]);
		}
	},
	update: function () {
		var {callback, dsID, eventName} = this.props,
			val = this.refs.input.getValue();

		callback([eventName, dsID, val]);
	},
	onKeyUp: function (ev) {
		if (ev.key === 'Enter' && this) {
			this.resetIfNull();
		}
	},
	render: function () {
		var {value: {'default': defaultValue, user}} = this.props,
			style = (user === defaultValue) ?
				styles.input.defaultValue : styles.input.user;

		return (
			<Input
				standalone={true}
				ref='input'
				onChange={this.update}
				onKeyUp={this.onKeyUp}
				onBlur={this.resetIfNull}
				style={style}
				type='text'
				value={user} />
		);
	}
});

module.exports = DefaultTextInput;
