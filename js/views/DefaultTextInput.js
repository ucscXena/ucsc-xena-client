'use strict';

/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

// Core dependencies, components
const React = require('react');
var {rxEvents, deepPureRenderMixin} = require('../react-utils');

// Comp styles
var compStyles = require('./DefaultTextInput.module.css');

var DefaultTextInput = React.createClass({
	mixins: [deepPureRenderMixin],
	componentWillMount: function () {
		var events = rxEvents(this, 'change');
		this.change = events.change
		.do(() => this.setState({value: this.refs.input.value}))
		.debounceTime(100)
		.subscribe(this.update);
	},
	componentWillUnmount: function () {
		this.change.unsubscribe();
	},
	getInitialState: function () {
		return {value: this.props.value.user, focused: false};
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
	onBlur() {
		this.setState({focused: false});
		this.resetIfNull();
	},
	onFocus() {
		this.setState({focused: true});
	},
	update: function () {
		var {onChange} = this.props,
			{value} = this.state;

		onChange(value);
	},
	onKeyUp: function (ev) {
		if (ev.key === 'Enter' && this) {
			this.resetIfNull();
			this.refs.input.blur();
		}
	},
	render: function () {
		var {value, focused} = this.state,
			{disabled = false} = this.props;

		return (
			<span style={{position: 'relative'}}>
			<label className={focused ? compStyles.labelFocused : compStyles.label}>Customize label</label>
			<input
				className={focused ? compStyles.inputFocused : compStyles.input}
				spellCheck={false}
				ref='input'
				disabled={disabled}
				onChange={this.on.change}
				onKeyUp={this.onKeyUp}
				onBlur={this.onBlur}
				onFocus={this.onFocus}
				type='text'
				title={value}
				value={value}/>
			</span>);
	}
});

module.exports = DefaultTextInput;
