import React from 'react';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import PureComponent from '../PureComponent';
var _ = require('../underscore_ext').default;
import XAutosuggestInput from './XAutosuggestInput';

var COHORT_UNASSIGNED = '(unassigned)';

var renderInputComponent = ({...props}) => (
	<XAutosuggestInput {...props} />);

var numPrefix = a => a[0] >= '0' && a[0] <= '9';
var neStrCmp = (a, b) => a < b ? -1 : 1;
var cohortCmp = (a, b) =>
	a === b ? 0 :
	a === COHORT_UNASSIGNED ? 1 :
	b === COHORT_UNASSIGNED ? -1 :
	numPrefix(a) && numPrefix(b) ? neStrCmp(a, b) : // hack to put 10x cohorts at end
	numPrefix(a) ? 1 :
	numPrefix(b) ? -1 :
	neStrCmp(a, b);

var getSuggestions = (value, cohorts) => {
	const wordValues = value.toLowerCase().trim().split(/\s+/);
	return cohorts
		.filter(c => _.every(wordValues, value => c.toLowerCase().indexOf(value) > -1))
		.sort(cohortCmp);
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
