import PureComponent from '../PureComponent';
var React = require('react');
import {Box} from '@material-ui/core';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutosuggestInput from './XAutosuggestInput';
var {Observable, Scheduler} = require('../rx').default;
var {matchPartialField, sparseDataMatchPartialField, refGene} = require('../xenaQuery');
var _ = require('../underscore_ext').default;
var {rxEvents} = require('../react-utils');
var limit = 8;

// Styles
var sxAutocomplete = {
	'& .MuiAutocomplete-clearIndicator': {
		visibility: 'visible'
	}
};

// Return the start and end indices of the word in 'value'
// under the cursor position.
function currentWordPosition(value, position) {
	var li = value.slice(0, position).lastIndexOf(' '),
		i = li === -1 ? 0 : li + 1,
		lj = value.slice(position).search(/(,?\s+)/),
		j = lj === -1 ? value.length : position + lj;
	return [i, j];
}

// Return the word in 'value' under the cursor position
function currentWord(value, position) {
	var [i, j] = currentWordPosition(value, position);
	return value.slice(i, j);
}

var renderInputComponent = ({ref, error, ...props}) => (
	<XAutosuggestInput
		error={Boolean(error)}
		helperText={_.isString(error) ? error : null}
		inputRef={el => ref(el)}
		{...props} />
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

	setInputRef = ref => {
		this.inputRef = ref;
	};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'change');
		this.change = events.change
			.debounceTime(200)
			.switchMap(value => value === undefined ? empty : fetchSuggestions(refGene[this.props.assembly], this.props.dataset, value))
			.subscribe(matches => this.setState({suggestions: matches}));
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	// Returns the word at the cursor position of the input value.
	getSuggestion = (inputValue) => {
		var position = this.inputRef?.selectionStart || 0;
		return currentWord(inputValue, position);
	};

	// Returns input value updated by new word.
	updateSuggestion = (suggestion) => {
		var position = this.inputRef.selectionStart,
			value = this.inputRef.value,
			[i, j] = currentWordPosition(value, position);
		return value.slice(0, i) + suggestion + value.slice(j);
	};

	// Callback fired when the input value changes.
	onInputChange = (ev, value, reason) => {
		var currentSuggestion = this.getSuggestion(value) || '';
		let newGeneSuggestion = value;
		if (reason === 'reset') {
			newGeneSuggestion = this.updateSuggestion(value) || '';
		}
		this.on.change(currentSuggestion);
		this.props.onChange(newGeneSuggestion);
	};

	// Callback fired when the popup requests to be opened.
	// Updates state with the current word matching the cursor position of the input value.
	onOpen = () => {
		var currentSuggestion = this.getSuggestion(this.props.value);
		this.on.change(currentSuggestion);
	};

	render() {
		var {onInputChange, onOpen} = this,
			{suggestProps, value = ''} = this.props,
			{suggestions} = this.state;

		return (
			<Box
				component={Autocomplete}
				autoComplete={false}
				blurOnSelect={false}
				closeIcon={<CloseRounded fontSize={'large'}/>}
				disableClearable={!value}
				filterOptions={() => suggestions} // Required with freeSolo i.e. user input is not bound to provided options.
				forcePopupIcon={!value}
				freeSolo
				onInputChange={onInputChange}
				onClose={() => this.on.change(undefined)} // Resets suggestions after selection.
				open={suggestions.length > 0}
				options={suggestions}
				popupIcon={<SearchRounded fontSize={'large'}/>}
				renderInput={(props) => renderInputComponent({
					...suggestProps, ...props,
					onClick: onOpen,
					ref: this.setInputRef,
					inputProps: {...props.inputProps, value}
				})}
				sx={sxAutocomplete}/>
		);
	}
}

module.exports = GeneSuggest;
