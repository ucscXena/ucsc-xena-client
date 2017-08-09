'use strict';

/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

// Core dependencies, components
const React = require('react');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

// Comp styles
var compStyles = require('./DefaultTextInput.module.css');

var DefaultTextInput = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		this.events('change');
		this.change = this.ev.change
		.do(() => this.setState({value: this.refs.input.value}))
		.debounceTime(100)
		.subscribe(this.update);
	},
	componentWillUnmount: function () {
		this.change.unsubscribe();
	},
	getInitialState: function () {
		return {value: this.props.value.user};
	},
	componentWillReceiveProps: function (newProps) {
		this.setState({value: newProps.value.user});
	},
	resetIfNull: function () {
		var {onChange, value: {'default': defaultValue}} = this.props,
			val = this.refs.input.value;

		if (val === "") {
			this.setState({value: defaultValue});
			onChange(defaultValue);
		}
	},
	update: function () {
		var {onChange} = this.props,
			{value} = this.state;

		onChange(value);
	},
	onKeyUp: function (ev) {
		if (ev.key === 'Enter' && this) {
			this.resetIfNull();
		}
	},
	render: function () {
		var {value} = this.state;

		return (
			<input
				className={compStyles.input}
				ref='input'
				onChange={this.on.change}
				onKeyUp={this.onKeyUp}
				onBlur={this.resetIfNull}
				type='text'
				title={value}
				value={value} />);
	}
});

module.exports = DefaultTextInput;
