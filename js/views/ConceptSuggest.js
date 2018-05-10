'use strict';

import PureComponent from '../PureComponent';
import React from 'react';
import XAutosuggest from './XAutosuggest';
import Input from 'react-toolbox/lib/input';

var RETURN = 13;
var returnPressed = ev => ev.keyCode === RETURN;

var renderInputComponent = ({ref, onChange, label, error, ...props}) => (
	<Input
		spellCheck={false}
		innerRef={el => ref(el && el.inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label= {label || 'Enter concept or text'}
		{...props} >
		<i style={{color: 'red', opacity: error ? 1 : 0}} className='material-icons'>error</i>
	</Input>
);

class ConceptSuggest extends PureComponent {
	state = {suggestions: [], value: ''};

	onSuggestionsFetchRequested = ({value}) => {
		// need to trim value?
		var {concepts} = this.props,
			lcv = value.toLowerCase();
		this.setState({suggestions: concepts.filter(c => c.toLowerCase().indexOf(lcv) !== -1)});
	};

	onSuggestionsClearRequested = () => {
		this.setState({suggestions: []});
	};

	onChange = (ev, {newValue, method}) => {
		// Don't update the value for 'up' and 'down' keys. If we do update
		// the value, it gives us an in-place view of the suggestion (pasting
		// the value into the input field), but the drawback is that it moves
		// the cursor to the end of the line. This messes up multi-word input.
		// We could try to preserve the cursor position, perhaps by passing a
		// custom input renderer. But for now, just don't update the value for
		// these events.
		if (method !== 'up' && method !== 'down') {
			this.setState({value: newValue});
		}
	};

	onKeyDown = ev => {
		var value = ev.target.value.trim();
		if (returnPressed(ev) && value.length > 0) {
			this.props.onAddTerm(value);
			this.setState({value: ''});
		}
	}

	getSuggestionValue = suggestion =>  suggestion;

	shouldRenderSuggestions = value => value.trim().length > 2;

	render() {
		var {onChange, onKeyDown} = this,
			{label, error} = this.props,
			{suggestions, value} = this.state;

		return (
			<XAutosuggest
				inputRef={this.setInput}
				suggestions={suggestions}
				renderSuggestion={v => <span>{v}</span>}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={this.getSuggestionValue}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderInputComponent={renderInputComponent}
				inputProps={{value, label, error, onKeyDown, onChange}}/>);
	}
}

export default ConceptSuggest;
