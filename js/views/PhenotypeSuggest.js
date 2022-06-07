
import PureComponent from '../PureComponent';
var React = require('react');
import XAutosuggest from './XAutosuggest';
import XAutosuggestInput from './XAutosuggestInput';
require('./GeneSuggest.css'); // XXX rename file

var renderInputComponent = ({ref, onChange, error, ...props}) => (
	<XAutosuggestInput
		error={error}
		fullWidth
		inputProps={{spellCheck: false}}
		inputRef={el => ref(el)}
		onChange={onChange}
		label='Search Phenotype'
		{...props} />
);

var filterFeatures = (lcValue, features) =>
	features.filter(f => f.label.toLowerCase().indexOf(lcValue) !== -1);

class PhenotypeSuggest extends PureComponent {
	state = {suggestions: []};

	onSuggestionsFetchRequested = ({value}) => {
		var lcValue = value.toLowerCase(),
			{features} = this.props;

		this.setState({
			suggestions: filterFeatures(lcValue, features)
		});
	};

	onSuggestionsClearRequested = () => {
		this.setState({suggestions: []});
	};

	onChange = (ev, {newValue}) => {
		this.props.onChange(newValue);
	};

	setInput = (input) => {
		var {inputRef} = this.props;
		this.input = input;
		if (inputRef) {
			inputRef(this.input);
		}
	};

	shouldRenderSuggestions = () => true;

	render() {
		var {onChange} = this,
			{onKeyDown, value = '', error} = this.props,
			{suggestions} = this.state;

		return (
			<XAutosuggest
				inputRef={this.setInput}
				suggestions={suggestions}
				onSuggestionSelected={this.props.onSuggestionSelected}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={x => x.label}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v.label}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, error, onKeyDown, onChange}}/>);
	}
}

module.exports = PhenotypeSuggest;
