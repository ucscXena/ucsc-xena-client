var React = require('react');
var _ = require('../underscore_ext').default;
import Input from 'react-toolbox/lib/input';
var {rxEvents} = require('../react-utils');

var isValid = _.curry((min, max, value) => {
	var v = value.trim(),
		i = parseInt(v);
	return v === '' || !(isNaN(i) || i < min || i > max);
});

function parseValue(value, dflt) {
	var v = value.trim();
	return v === '' ? dflt : parseInt(v);
}

// initialValue is int or null.
// dflt, min, max are int.
class NumberForm extends React.Component {
	constructor(props) {
	    super(props);
	    var {initialValue} = props;
	    this.state = {value: initialValue == null ? '' : '' + initialValue, focused: false};
	}

	componentWillMount() {
		var {dflt, min, max} = this.props;
		var events = rxEvents(this, 'change');
		this.change = events.change
			.do(value => this.setState({value}))
			.debounceTime(200)
			.filter(isValid(min, max))
			.subscribe(value => this.props.onChange(parseValue(value, dflt)));
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	onBlur = () => {
		this.setState({focused: false});
	};

	onFocus = () => {
		this.setState({focused: true});
	};

	render() {
		var {min, max} = this.props,
			other = _.omit(this.props, 'min', 'max', 'dflt', 'initialValue'),
			{value, focused} = this.state;
		return (
			<form>
				<Input
					{...other}
					onBlur={this.onBlur}
					onFocus={this.onFocus}
					type='text'
					value={'' + value}
					label={`Custom survival time cutoff`}
					placeholder={focused ? `Enter between ${min} and ${max}` : undefined}
					onChange={this.on.change}/>
			</form>
		);
	}
}

module.exports = NumberForm;
