'use strict';

var React = require('react');
import Autosuggest from 'react-autosuggest';
import Input from 'react-toolbox/lib/input';
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
require('./GeneSuggest.css'); // XXX rename file

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		ref={el => ref(el && el.getWrappedInstance().inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Primary disease or Tissue of Origin'
		{...props} />);

var DiseaseSuggest = React.createClass({
	mixins: [deepPureRenderMixin],
	onSuggestionsFetchRequested({value}) {
		var lcValue = value.toLowerCase(),
			{cohortMeta} = this.props,
			tags = Object.keys(cohortMeta);
		this.setState({
			suggestions: _.uniq(_.flatmap(_.filter(tags, t => t.toLowerCase().indexOf(lcValue) === 0), t => cohortMeta[t])).sort()
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
			<Autosuggest
				ref='autosuggest'
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				onSuggestionSelected={this.onSelect}
				getSuggestionValue={x => x}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, onChange, onBlur}}/>);
	}
});

module.exports = DiseaseSuggest;

