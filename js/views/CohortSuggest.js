import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import PureComponent from '../PureComponent';
var _ = require('../underscore_ext').default;
import XAutosuggestInput from './XAutosuggestInput';

var renderInputComponent = ({...props}) => (
	<XAutosuggestInput {...props} />);

var getSuggestions = (value, cohorts) => {
	const wordValues = value.toLowerCase().trim().split(/\s+/);
	return cohorts.filter(c => _.every(wordValues, value => c.toLowerCase().indexOf(value) > -1)).sort();
};

export class CohortSuggest extends PureComponent {

	filterOptions = (options, {inputValue}) => {
		return getSuggestions(inputValue, options);
	};

	onChange = (ev, value) => {
		this.props.onSelect(value);
	};

	render() {
		var {filterOptions, onChange} = this;
		var {cohort, cohorts, suggestProps} = this.props,
			disabled = cohorts.length === 0;
		return (
			<Autocomplete
				closeIcon={<CloseRounded fontSize={'large'}/>}
				disabled={disabled}
				filterOptions={filterOptions}
				forcePopupIcon={!cohort}
				onChange={onChange}
				options={cohorts}
				popupIcon={<SearchRounded fontSize={'large'}/>}
				renderInput={(props) => renderInputComponent({...suggestProps, ...props})}
				value={cohort}/>
		);
	}
}
