/**
 * UCSC Xena Client
 * http://xena.ucsc.edu
 *
 * Xena autocomplete suggest component with optional basic/advanced suggestion selection.
 */

// Core dependencies, components
import Autocomplete from '@material-ui/lab/Autocomplete';
import {Box, Checkbox, Chip, Icon, List, Paper} from '@material-ui/core';
import CloseRounded from '@material-ui/icons/CloseRounded';
import SearchRounded from '@material-ui/icons/SearchRounded';
import React, {forwardRef, useCallback, useEffect, useRef, useState} from 'react';
import * as _ from '../underscore_ext.js';
import XAutosuggestInput from './XAutosuggestInput';
import XColumnDivider from './XColumnDivider';
import XFormControl from './XFormControl';
import {xenaColor} from '../xenaColor';
import XToggleButtonGroup from './XToggleButtonGroup';

// Styles
var sxFormControl = {
	'& .MuiAutocomplete-clearIndicator': {
		visibility: 'visible'
	}
};
var sxListbox = {
	'&.MuiAutocomplete-listbox': {
		margin: '8px 0',
	},
	'&& li .MuiAutocomplete-groupUl:after': {
		backgroundColor: xenaColor.GRAY_DARK,
		content: '" "',
		display: 'block',
		height: 1,
		margin: '8px 0',
		width: '100%',
	},
	'&& li:last-of-type .MuiAutocomplete-groupUl:after': {
		display: 'none',
	},
	'&& .MuiAutocomplete-option': {
		alignItems: 'center',
		display: 'grid',
		gridGap: 12,
		gridTemplateColumns: '24px 1fr',
		padding: '10px 24px',
		wordBreak: 'break-word',
	}
};
var sxOption = {
	display: 'flex',
	flexDirection: 'column',
	fontSize: 16,
	lineHeight: '20px',
};
var sxSelectedValues = {
	display: 'flex',
	flexWrap: 'wrap',
	gap: 8,
	justifyContent: 'flex-start',
	minWidth: 0,
};

var filterOptions = (options, {inputValue}) => {
	const lcValue = inputValue.toLowerCase();
	return options.filter(f => f.label.toLowerCase().indexOf(lcValue) !== -1);
};

// Returns options flattened with the property:
// - 'group' added to each option - facilitating the MuiAutocomplete 'groupBy' functionality, and
// - 'badge' removed from each option - should the badge not be displayed.
var getOptions = (options, hideBadge) =>
	options.flatMap(option => option.options.map(o => {
		const cOption = {...o, group: option.label};
		if (hideBadge) {
			delete cOption.badge;
		}
		return cOption;
	}));

// Renders autocomplete lists.
var Listbox = forwardRef(({children, ...props}, ref) => {
		return <Box component={List} ref={ref} sx={{...sxListbox}} {...props}>{children}</Box>;
	}
);

// Renders the option.
var renderOption = ({badge, label, value}, {selected}) =>
	<>
		<Box component={Checkbox} checked={selected} value={value} sx={{justifySelf: 'center'}}/>
		<Box sx={sxOption}>
			<span>{label}</span>
			{badge && <Box component='span' fontSize={14} fontWeight={600} sx={{...badge.style}}>{badge.label}</Box>}
		</Box>
	</>;

export default function XAutocompleteSuggest({
 actions,
 options: suggestions,
 hideBadge,
 onChange,
 onPending,
 selectedValues,
 suggestProps
}) {
	const autoCompleteRef = useRef();
	const [autocompleteActions, setAutocompleteActions] = useState(actions);
	const [inputValue, setInputValue] = useState('');
	const options = getOptions(suggestions, hideBadge);
	const isGroupBy = options.every(option => option.group);
	const values = selectedValues.map(selectedValue => options.find(option => option.value === selectedValue));

	// Autocomplete onChange (on selection of option).
	const onSelect = ({key, type}, value, reason) => {
		if (reason === 'clear') {
			return; // Prevents selected values from resetting on click of clear button.
		}
		if (type === 'keydown' && key === 'Backspace' && reason === 'remove-option') {
			return; // Prevents backspace from removing selected options (see https://github.com/mui/material-ui/issues/21333).
		}
		const selectedValues = value.map(v => v.value);
		onChange(selectedValues);
	};

	// Setting pending to false facilitates setting the focus on
	// the WizardCard component 'Done' button - should all card selected values be valid.
	const onBlur = () => {
		onPending(false);
	};

	// Callback fired when the popup requests to be closed.
	// Clears input value on blur or escape key.
	const onClose = (ev, reason) => {
		if (reason === 'blur' || reason === 'escape') {
			setInputValue('');
		}
	};

	// Callback fired when the selected value is to be removed (i.e. selected value delete 'x' button is clicked).
	const onDelete = useCallback((ev, value) => {
		const newValues = values.filter(v => v.value !== value);
		onSelect(ev, newValues, 'remove-option');
	}, [values]);

	// Setting pending to true will prevent setting the focus on the
	// WizardCard component 'Done' button prematurely i.e. while the autocomplete panel remains in use.
	const onFocus = () => {
		onPending(true);
	};

	// Callback fired when the input value changes.
	const onInputChange = (ev, value, reason) => {
		if (reason !== 'reset') {
			setInputValue(value);
		}
	};

	// Returns the paper component to render the body of the popup.
	const AutocompletePaper = useCallback(({children, ...props}) => {
		return (
			<Paper {...props} role='combobox' onMouseDown={(ev) => ev.preventDefault()}>
				{autocompleteActions ? <>
					<Box sx={{my: 2, padding: '8px 16px'}}>
						<XToggleButtonGroup toggleButtons={autocompleteActions}/>
					</Box>
					<XColumnDivider/>
				</> : null}
				{children}
			</Paper>
		);
	}, [autocompleteActions]);

	// Prop 'actions' causes paper component to remount.
	// The solution is to store actions in state and only update the state variable when toggling between actions.
	// See https://github.com/mui/material-ui/issues/31073
	useEffect(() => {
		if (_.isEqual(actions, autocompleteActions)) {
			return;
		}
		setAutocompleteActions(actions);
	}, [actions, autocompleteActions]);

	return (
		<Box ref={autoCompleteRef} sx={{display: 'grid', gridGap: 8}}>
			<Box component={XFormControl} sx={sxFormControl}>
				<Autocomplete
					autoSelect={false}
					blurOnSelect={false}
					closeIcon={<CloseRounded fontSize={'large'}/>}
					disableClearable={!inputValue}
					disableCloseOnSelect
					filterOptions={filterOptions}
					forcePopupIcon={!inputValue}
					getOptionLabel={({label}) => label}
					getOptionSelected={(option, value) => option.value === value.value}
					groupBy={isGroupBy ? ({group}) => group : undefined}
					inputValue={inputValue}
					ListboxComponent={Listbox}
					multiple
					onChange={onSelect}
					onClose={onClose}
					onInputChange={onInputChange}
					options={options}
					PaperComponent={AutocompletePaper}
					popupIcon={<SearchRounded fontSize={'large'}/>}
					renderInput={(props) => <XAutosuggestInput {...{...suggestProps, ...props, onBlur: onBlur, onFocus: onFocus}}/>}
					renderOption={renderOption}
					renderTags={() => null}
					value={values}
				/>
			</Box>
			{values.length > 0 ?
				<Box sx={sxSelectedValues}>
					{values.map(({label, value}, i) =>
						<Chip
							key={`${value}${i}`}
							deleteIcon={<Icon>close</Icon>}
							label={label}
							onClick={(ev) => onDelete(ev, value)}
							onDelete={(ev) => onDelete(ev, value)}/>)}
				</Box> : null}
		</Box>
	);
}
