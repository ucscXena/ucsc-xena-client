'use strict';

var React = require('react');
import Autosuggest from 'react-autosuggest';
import Input from 'react-toolbox/lib/input';
var {sparseDataMatchPartialField, refGene} = require('../xenaQuery');
var _ = require('../underscore_ext');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');
require('./GeneSuggest.css');
var limit = 8;

// Return the start and end indices of the word in 'value'
// under the cursor position.
function currentWordPosition(value, position) {
	var li = value.slice(0, position).lastIndexOf(' '),
		i = li === -1 ? 0 : li + 1,
		lj = value.slice(position).indexOf(' '),
		j = lj === -1 ? value.length : position + lj;
	return [i, j];
}

// Return the word in 'value' under the cursor position
function currentWord(value, position) {
	var [i, j] = currentWordPosition(value, position);
	return value.slice(i, j);
}

var defaultAssembly = 'hg38';

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		ref={el => ref(el && el.getWrappedInstance().inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Gene or position'
		{...props} />);

// Currently we only match against refGene hg38 genes. We could, instead, match
// on specific datasets (probemap, mutation, segmented, refGene), but that will
// require some more work to dispatch the query for each type.
var GeneSuggest = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	componentWillMount() {
		var {host, name} = refGene[this.props.assembly] || refGene[defaultAssembly];
		this.events('change');
		this.ev.change
			.distinctUntilChanged(_.isEqual)
			.debounceTime(200)
			.switchMap(value => sparseDataMatchPartialField(host, 'name2', name, value, limit)).subscribe(matches => this.setState({suggestions: matches}));
	},
	onSuggestionsFetchRequested({value}) {
		var position = this.refs.autosuggest.input.selectionStart,
			word = currentWord(value, position);

		if (word !== '') {
			this.ev.change.next(word);
		}
	},
	shouldRenderSuggestions(value) {
		var position = this.refs.autosuggest.input.selectionStart,
			word = currentWord(value, position);
		return word.length > 0;
	},
	onSuggestionsClearRequested() {
		this.setState({suggestions: []});
	},
	getInitialState() {
		return {suggestions: []};
	},
	onChange(ev, {newValue, method}) {
		// Don't update the value for 'up' and 'down' keys. If we do update
		// the value, it gives us an in-place view of the suggestion (pasting
		// the value into the input field), but the drawback is that it moves
		// the cursor to the end of the line. This messes up multi-word input.
		// We could try to preserve the cursor position, perhaps by passing a
		// custom input renderer. But for now, just don't update the value for
		// these events.
		if (method !== 'up' && method !== 'down') {
			this.props.onChange(newValue);
		}
	},
	getSuggestionValue(suggestion) {
		var position = this.refs.autosuggest.input.selectionStart,
			value = this.refs.autosuggest.input.value,
			[i, j] = currentWordPosition(value, position);

		// splice the suggestion into the current word
		return value.slice(0, i) + suggestion + value.slice(j);
	},
	render() {
		var {onChange} = this,
			{suggestions} = this.state,
			{value = ""} = this.props;

		return (
			<Autosuggest
				ref='autosuggest'
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={this.getSuggestionValue}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, onChange}}/>);
	}
});

module.exports = GeneSuggest;
