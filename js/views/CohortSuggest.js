'use strict';

import React from 'react';
import Input from 'react-toolbox/lib/input';
import _ from '../underscore_ext';
import { deepPureRenderMixin } from '../react-utils';
import './GeneSuggest.css'; // XXX rename file
import XAutosuggest from './XAutosuggest';

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		ref={el => ref(el && el.getWrappedInstance().inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Study'
		{...props} />);

var CohortSuggest = React.createClass({
	mixins: [deepPureRenderMixin],
	onSuggestionsFetchRequested({ value }) {
		const wordValues = value.toLowerCase().trim().split(/\s+/);

		const filteredSuggestions = this.props.cohorts.filter(c =>
			_.every(wordValues, value => c.toLowerCase().indexOf(value) > -1)).sort();

		this.setState({ suggestions: filteredSuggestions });
	},
	onSuggestionsClearRequested() {
		this.setState({suggestions: []});
	},
	getInitialState() {
		return {suggestions: [], value: this.props.cohort || ""};
	},
	componentWillReceiveProps(props) {
		this.setState({value: this.state.value || props.cohort || ""});
	},
	onClear() {
		this.setState({value: ""});
	},
	onChange(ev, {newValue}) {
		this.setState({value: newValue});
	},
	onSelect(ev, {suggestionValue}) {
		this.props.onSelect(suggestionValue);
	},
	onBlur() {
		this.setState({value: this.props.cohort || this.state.value});
	},
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
});

module.exports = CohortSuggest;
