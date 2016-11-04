'use strict';
var React = require('react');
var Input = require('react-bootstrap/lib/Input');

var ValidatedInput = React.createClass({
	getInitialState: function () {
		var {value, isValid} = this.props;
		return {
			value,
			isValid: isValid(value)
		};
	},
	onChange: function (ev) {
		this.setState({isValid: this.props.isValid(ev.target.value)});
	},
	getValue: function () {
		return this.refs.input.getValue();
	},
	render: function () {
		var {value, isValid} = this.state;
		return <Input bsStyle={isValid ? 'success' : 'error'} hasFeedback={true} defaultValue={value} onChange={this.onChange} ref='input' {...this.props}/>;
	}
});

module.exports = ValidatedInput;
