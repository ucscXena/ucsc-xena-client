import React from 'react';
import PureComponent from '../PureComponent';
var _ = require('../underscore_ext').default;
import './GeneSuggest.css'; // XXX rename file
import XAutosuggest from './XAutosuggest';
import XAutosuggestInput from './XAutosuggestInput';

var renderInputComponent = ({ref, onChange, ...props}) => (
	<XAutosuggestInput
		fullWidth
		inputProps={{spellCheck: false}}
		inputRef={el => ref(el)}
		onChange={onChange}
		label='Search for a study'
		{...props} />);

var getSuggestions = (value, cohorts) => {
	const wordValues = value.toLowerCase().trim().split(/\s+/);
	return cohorts.filter(c => _.every(wordValues, value => c.toLowerCase().indexOf(value) > -1)).sort();
};

export class CohortSuggest extends PureComponent {
	state = {suggestions: [], value: this.props.cohort || ""};

	onSuggestionsFetchRequested = ({value}) => {
		this.setState({ suggestions: getSuggestions(value, this.props.cohorts) });
	};

	onSuggestionsClearRequested = () => {
		this.setState({suggestions: []});
	};

	UNSAFE_componentWillReceiveProps(props) {//eslint-disable-line camelcase
		var value = this.state.value || props.cohort || "";
		this.setState({
			value,
			suggestions: value.trim().length > 0 ? getSuggestions(value, props.cohorts) : []
		});
	}

	onClear = () => {
		this.setState({value: ''});
		_.defer(() => this.props.onSelect(null));
	};

	onChange = (ev, {newValue}) => {
		this.setState({value: newValue});
	};

	onSelect = (ev, {suggestionValue}) => {
		// When props arrive we need to prefer user input, however that
		// prevents us setting state (setState here will be overwritten
		// by setState in componentWillReceiveProps, which will use the
		// old value of state). A horrible work-around is to defer
		// the call to onSelect. Similarly, with onClear, above.
		this.setState({value: ''});
		_.defer(() => this.props.onSelect(suggestionValue));
	};

	onBlur = () => {
		this.setState({value: this.props.cohort || this.state.value});
	};

	shouldRenderSuggestions = () => true;

	render() {
		var {onChange, onBlur} = this,
			{suggestions, value} = this.state;
		return (
			<XAutosuggest
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				onSuggestionSelected={this.onSelect}
				getSuggestionValue={x => x}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, onChange, onBlur}}
				onClear={this.onClear}
				value={value} />
		);
	}
}
