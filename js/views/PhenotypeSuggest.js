'use strict';

var React = require('react');
var XAutosuggest = require('./XAutosuggest');
import Input from 'react-toolbox/lib/input';
var {deepPureRenderMixin} = require('../react-utils');
require('./GeneSuggest.css'); // XXX rename file

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		ref={el => ref(el && el.getWrappedInstance().inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Phenotype'
		{...props} />);

var filterFeatures = (lcValue, features) =>
	features.filter(f => f.label.toLowerCase().indexOf(lcValue) !== -1);

var PhenotypeSuggest = React.createClass({
	mixins: [deepPureRenderMixin],
	onSuggestionsFetchRequested({value}) {
		var lcValue = value.toLowerCase(),
			{features} = this.props;

		this.setState({
			suggestions: filterFeatures(lcValue, features)
		});
	},
	onSuggestionsClearRequested() {
		this.setState({suggestions: []});
	},
	getInitialState() {
		return {suggestions: [], value: this.props.value || ""};
	},
	onChange(ev, {newValue}) {
		this.setState({value: newValue});
		if (this.props.onChange) {
			this.props.onChange(newValue);
		}
	},
	setInput(input) {
		var {inputRef} = this.props;
		this.input = input;
		if (inputRef) {
			inputRef(this.input);
		}
	},
	render() {
		var {onChange} = this,
			{onKeyDown} = this.props,
			{suggestions, value} = this.state;

		return (
			<XAutosuggest
				inputRef={this.setInput}
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={x => x.label}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v.label}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, onKeyDown, onChange}}/>);
	}
});

module.exports = PhenotypeSuggest;
