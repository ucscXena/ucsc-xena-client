
import PureComponent from '../PureComponent';

var React = require('react');
import XAutosuggest from './XAutosuggest';
import Input from 'react-toolbox/lib/input';
import {Observable, Scheduler} from '../rx';

var {matchPartialField, sparseDataMatchPartialField, refGene} = require('../xenaQuery');
var _ = require('../underscore_ext');
var {rxEvents} = require('../react-utils');
require('./GeneSuggest.css'); // react-autosuggest, global styles
var styles = require('./GeneSuggest.module.css'); // react-toolbox, module styles
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

var renderInputComponent = ({ref, onChange, label, error, ...props}) => (
	<Input
		theme={styles}
		error={_.isString(error) ? error : null}
		spellCheck={false}
		innerRef={el => ref(el && el.inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label={label || 'Add Gene or Position'}
		{...props} >
		<i style={{color: 'red', opacity: error ? 1 : 0}} className='material-icons'>error</i>
	</Input>
);

var empty = Observable.of([], Scheduler.asap);

// host and name are for gene lookup.
// dataset is for probe lookup
var fetchSuggestions = (assembly, dataset, value) =>
	Observable.zip(
		assembly ? sparseDataMatchPartialField(assembly.host, 'name2', assembly.name, value, limit).catch(() => empty) :
		empty,
		dataset ? matchPartialField(dataset, value, limit).catch(() => empty) :
		empty,
		(genes, probes) => genes.sort().concat(_.difference(probes, genes).sort()));

// Currently we only match against refGene hg38 genes. We could, instead, match
// on specific datasets (probemap, mutation, segmented, refGene), but that will
// require some more work to dispatch the query for each type.
class GeneSuggest extends PureComponent {
	state = {suggestions: []};

	componentWillMount() {
		var events = rxEvents(this, 'change');
		this.change = events.change
			.debounceTime(200)
			.switchMap(value => value === undefined ? empty : fetchSuggestions(refGene[this.props.assembly], this.props.dataset, value))
			.subscribe(matches => this.setState({suggestions: matches}));
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	onSuggestionsFetchRequested = ({value}) => {
		var position = this.input.selectionStart,
			word = currentWord(value, position);

		this.on.change(word);
	};

	shouldRenderSuggestions = () => {
		return true;
	};

	onSuggestionsClearRequested = () => {
		this.on.change(undefined);
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
			this.props.onChange(newValue);
		}
	};

	getSuggestionValue = (suggestion) => {
		var position = this.input.selectionStart,
			value = this.input.value,
			[i, j] = currentWordPosition(value, position),
			withSuggestion = value.slice(0, i) + suggestion + value.slice(j),
			space = withSuggestion[withSuggestion.length - 1] === ' ' ? '' : ' ';

		// splice the suggestion into the current word
		return withSuggestion + space;
	};

	setInput = (input) => {
		var {inputRef} = this.props;
		this.input = input;
		if (inputRef) {
			inputRef(this.input);
		}
	};

	setAutosuggest = v => {
		this.autosuggest = v;
	}

	onKeyDown = ev => {
		// We'd like <return> to select a suggestion when suggestions are shown,
		// but invoke "Done" when suggestions are not shown. react-autosuggest
		// won't tell us when it's open. So, we have to inspect the child state
		// to infer when it's open.
		if (this.props.onKeyDown &&
			(!_.getIn(this, ['autosuggest', 'state', 'isFocused']) ||
				_.getIn(this, ['autosuggest', 'state', 'isCollapsed']))) {

			this.props.onKeyDown(ev);
		}
	}

	render() {
		var {onChange, onKeyDown} = this,
			{value = '', label, error} = this.props,
			{suggestions} = this.state;

		return (
			<XAutosuggest
				inputRef={this.setInput}
				autosuggestRef={this.setAutosuggest}
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={this.getSuggestionValue}
				shouldRenderSuggestions={this.shouldRenderSuggestions}
				renderSuggestion={v => <span>{v}</span>}
				renderInputComponent={renderInputComponent}
				inputProps={{value, label, error, onKeyDown, onChange}}/>);
	}
}

module.exports = GeneSuggest;
