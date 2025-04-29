
/*
 * Text input element with a default value which will
 * - Style the text if the user has entered a non-default value
 * - Restore the default if the user deletes the text
 */

// Core dependencies, components
import PureComponent from '../PureComponent';
const React = require('react');
import { rxEvents } from '../react-utils.js';

// Comp styles
import compStyles from "./DefaultTextInput.module.css";

class DefaultTextInput extends PureComponent {
	state = {value: this.props.value.user, focused: false};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'change');
		this.change = events.change
		.do(() => this.setState({value: this.refs.input.value}))
		.debounceTime(100)
		.subscribe(this.update);
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	UNSAFE_componentWillReceiveProps(newProps) {//eslint-disable-line camelcase
		this.setState({value: newProps.value.user});
	}

	resetIfNull = () => {
		var {onChange, value: {'default': defaultValue}} = this.props,
			val = this.refs.input.value;

		if (val === "") {
			this.setState({value: defaultValue});
			onChange(defaultValue);
		}
	};

	onBlur = () => {
		this.setState({focused: false});
		this.resetIfNull();
	};

	onFocus = () => {
		this.setState({focused: true});
	};

	update = () => {
		var {onChange} = this.props,
			{value} = this.state;

		onChange(value);
	};

	onKeyUp = (ev) => {
		if (ev.key === 'Enter' && this) {
			this.resetIfNull();
			this.refs.input.blur();
		}
	};

	render() {
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
}

export default DefaultTextInput;
