'use strict';

var React = require('react');
import Input from 'react-toolbox/lib/input';
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
require('./GeneSuggest.css'); // XXX rename file
var XAutosuggest = require('./XAutosuggest');

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		ref={el => ref(el && el.getWrappedInstance().inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Study'
		{...props} />);

var CohortSuggest = React.createClass({
	mixins: [deepPureRenderMixin],
	onSuggestionsFetchRequested({value}) {
		var lcValue = value.toLowerCase();
		this.setState({
			suggestions: _.filter(this.props.cohorts, c => c.toLowerCase().indexOf(lcValue) !== -1).sort()
		});
	},
	onSuggestionsClearRequested() {
		this.setState({suggestions: []});
	},
	getInitialState() {
		return {suggestions: [], value: this.props.cohort || ""};
	},
	componentWillReceiveProps(props) {
		this.setState({value: props.cohort || ""});
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
		this.setState({value: this.props.cohort || ""});
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
