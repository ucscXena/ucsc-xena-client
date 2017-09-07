'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var _s = require('underscore.string');
import Input from 'react-toolbox/lib/input';
var rxEventsMixin = require('../react-utils').rxEventsMixin;

var isValid = _.curry((min, max, value) => {
	var v = _s.trim(value),
		i = parseInt(v);
	return v === '' || !(isNaN(i) || i < min || i > max);
});

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
			.do(value => this.setState({value}))
			.debounceTime(200)
			.filter(isValid(min, max))
			.subscribe(value => this.props.onChange(parseValue(value, dflt)));
	},
	componentWillUnmount: function () {
		this.change.unsubscribe();
	},
	onBlur() {
		this.setState({focused: false});
	},
	onFocus() {
		this.setState({focused: true});
	},
	getInitialState: function () {
		var {initialValue} = this.props;
		return {value: initialValue == null ? '' : '' + initialValue, focused: false};
	},
	render() {
		var {min, max, dflt, initialValue, ...other} = this.props,
			{value, focused} = this.state;
		return (
			<form className="form-horizontal">
				<Input
					{...other}
					onBlur={this.onBlur}
					onFocus={this.onFocus}
					type='text'
					value={'' + value}
					label={`Survival time cutoff (in range [${min}, ${max}])`}
					placeholder={focused ? 'Enter a number.' : undefined}
					onChange={this.on.change}/>
			</form>
		);
	}
});

module.exports = NumberForm;
