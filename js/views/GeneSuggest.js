import PureComponent from '../PureComponent';
import React from 'react';
import {Box} from '@material-ui/core';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutocompleteFormControl from './XAutocompleteFormControl';
import XAutosuggestInput from './XAutosuggestInput';
import Rx from '../rx';
const {Observable, Scheduler} = Rx;
import xenaQuery from '../xenaQuery';
var {matchPartialField, sparseDataMatchPartialField, refGene} = xenaQuery;
import * as _ from '../underscore_ext.js';
import { rxEvents } from '../react-utils.js';
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
	state = {open: false, suggestions: []};

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

	// Setting pending to false facilitates setting the focus on
	// the WizardCard component 'Done' button - should all card selected values be valid.
	onBlur = () => {
		this.setState({open: false});
		this.props.onPending(false);
	}

	// Setting pending to true will prevent setting the focus on the
	// WizardCard component 'Done' button prematurely i.e. while the autocomplete panel remains in use.
	onFocus = () => {
		this.setState({open: true});
		this.props.onPending(true);
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

	// Callback fired when input text is selected.
	// Updates state with the current word matching the cursor position of the input value.
	// Setting pending to true will prevent setting the focus on the
	// WizardCard component 'Done' button prematurely i.e. while the autocomplete panel remains in use.
	onSelect = (ev) => {
		if (ev.nativeEvent.type === 'mouseup') {
			var currentSuggestion = this.getSuggestion(this.props.value);
			this.on.change(currentSuggestion);
		}
	};

	render() {
		var {onBlur, onFocus, onInputChange, onSelect} = this,
			{suggestProps, value = ''} = this.props,
			{open, suggestions} = this.state,
			{formLabel, ...autosuggestInputProps} = suggestProps;

		return (
			<XAutocompleteFormControl
				formLabel={formLabel}
				helperText={_.isString(suggestProps.error) ? suggestProps.error : undefined}>
				<Box
					component={Autocomplete}
					autoComplete={false}
					blurOnSelect={false}
					closeIcon={<CloseRounded fontSize={'large'}/>}
					disableClearable={!value}
					filterOptions={() => suggestions} // Required with freeSolo i.e. user input is not bound to provided options.
					forcePopupIcon={!value}
					freeSolo
					onClose={() => this.on.change(undefined)} // Resets suggestions after selection.
					onInputChange={onInputChange}
					open={open && suggestions.length > 0}
					options={suggestions}
					popupIcon={<SearchRounded fontSize={'large'}/>}
					renderInput={(props) => renderInputComponent({
						...autosuggestInputProps,
						...props,
						onBlur: onBlur,
						onFocus: onFocus,
						onSelect: onSelect,
						ref: this.setInputRef,
						inputProps: {...props.inputProps, value}
					})}
					sx={sxAutocomplete}/>
			</XAutocompleteFormControl>
		);
	}
}

export default GeneSuggest;
