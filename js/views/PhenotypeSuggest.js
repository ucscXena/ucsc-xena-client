
import PureComponent from '../PureComponent';
var React = require('react');
import {SearchRounded} from '@material-ui/icons';
import Autocomplete from '@material-ui/lab/Autocomplete';
import XAutosuggestInput from './XAutosuggestInput';

var renderInputComponent = ({error, ...props}) => (
	<XAutosuggestInput error={Boolean(error)} {...props}/>
);

var filterFeatures = (value, features) => {
	const lcValue = value.toLowerCase();
	return features.filter(f => f.label.toLowerCase().indexOf(lcValue) !== -1);
};

class PhenotypeSuggest extends PureComponent {
	state = {inputValue: ''};

	filterOptions = (options, {inputValue}) => {
		return filterFeatures(inputValue, options);
	};

	onChange = (ev, value, reason) => {
		if (reason === 'select-option') {
			this.props.onChange(value);
		}
	};

	onInputChange = (ev, value, reason) => {
		const inputValue = reason === 'reset' ? '' : value;
		this.setState({inputValue});
	};

	render() {
		var {filterOptions, onChange, onInputChange} = this,
			{features, suggestProps} = this.props,
			{inputValue} = this.state;
		return (
			<Autocomplete
				disableClearable
				filterOptions={filterOptions}
				forcePopupIcon={true}
				getOptionLabel={({label}) => label}
				inputValue={inputValue}
				onChange={onChange}
				onInputChange={onInputChange}
				options={features}
				popupIcon={<SearchRounded fontSize={'large'}/>}
				renderInput={(props) => renderInputComponent({...suggestProps, ...props})}/>);
	}
}

module.exports = PhenotypeSuggest;
