'use strict';

/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

require('./DefaultTextInput.css');
const React = require('react');
var Input = require('react-bootstrap/lib/Input');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');

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
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount: function () {
		this.events('change');
		this.change = this.ev.change
		.do(() => this.setState({value: this.refs.input.getValue()}))
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
			val = this.refs.input.getValue();

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
		var {value: {'default': defaultValue}} = this.props,
			{value} = this.state,
			style = (value === defaultValue) ?
				styles.input.defaultValue : styles.input.user;

		return (
			<Input
				wrapperClassName='DefaultTextInput'
				standalone={true}
				ref='input'
				onChange={this.on.change}
				onKeyUp={this.onKeyUp}
				onBlur={this.resetIfNull}
				style={style}
				type='text'
				title={value}
				value={value} />);
	}
});

module.exports = DefaultTextInput;
