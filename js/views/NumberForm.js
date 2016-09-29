'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var _s = require('underscore.string');
var Input = require('react-bootstrap/lib/Input');
var rxEventsMixin = require('../react-utils').rxEventsMixin;

var isValid = _.curry((min, max, value) => {
	var v = _s.trim(value),
		i = parseInt(v);
	return v === '' || !(isNaN(i) || i < min || i > max);
});

var validationState = (min, max, value) =>
	isValid(min, max, value) ? 'success' : 'error';

function parseValue(value, dflt) {
	var v = _s.trim(value);
	return v === '' ? dflt : parseInt(v);
};

// initialValue is int or null.
// dflt, min, max are int.
const NumberForm = React.createClass({
	mixins: [rxEventsMixin],
	componentWillMount: function () {
		var {dflt, min, max} = this.props;
		this.events('change');
		this.change = this.ev.change
			.map(ev => ev.target.value)
			.do(value => this.setState({value}))
			.throttle(200)
			.filter(isValid(min, max))
			.subscribe(value => this.props.onChange(parseValue(value, dflt)));
	},
	componentWillUnmount: function () {
		this.change.dispose();
	},
	getInitialState: function () {
		var {initialValue} = this.props;
		return {value: initialValue == null ? '' : '' + initialValue};
	},
	render() {
		var {min, max, dflt, initialValue, ...other} = this.props,
			{value} = this.state;
		return (
			<form className="form-horizontal">
				<Input
					{...other}
					type='text'
					value={'' + value}
					label={`X-Axis cutoff (in range [${min}, ${max}])`}
					placeholder='Enter a number.'
					bsStyle={validationState(min, max, value)}
					hasFeedback
					onChange={this.ev.change}/>
			</form>
		);
	}
});

module.exports = NumberForm;
