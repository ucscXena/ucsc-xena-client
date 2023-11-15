import Autocomplete from '@material-ui/lab/Autocomplete';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import PureComponent from '../PureComponent';
var {isEqual, mmap} = require('../underscore_ext').default;
import XAutosuggestInput from './XAutosuggestInput';
var {Observable, Scheduler} = require('../rx').default;
var {rxEvents} = require('../react-utils');
var {matchPartialField} = require('../xenaQuery');
import {el} from '../chart/react-hyper';

var xAutosuggestInput = el(XAutosuggestInput);
var autocomplete = el(Autocomplete);
var closeRounded = el(CloseRounded);
var searchRounded = el(SearchRounded);

var empty = Observable.of([], Scheduler.asap);
var limit = 8;

// dataset is for probe lookup
// XXX review these for relevance to singlecell display
var fetchSuggestions = (datasets, value) =>
	Observable.zip(
		...datasets.map(({name, host}) =>
			matchPartialField(host, name, value, limit).catch(() => empty)),
		(...dsMatches) => mmap(datasets, dsMatches,
			(dataset, matches) => matches.map(field => ({field,  ...dataset})))
			.flat());

var getOptionLabel = ({field, dataSubType}) => `${field} - ${dataSubType}`;
var filterOptions = (options, {inputValue}) =>
	options.filter(({field}) =>
		field.toLowerCase().startsWith(inputValue.trim().toLowerCase()));

export class GeneDatasetSuggest extends PureComponent {
	state = {suggestions: [], inputValue:
		this.props.value ? getOptionLabel(this.props.value) : ''};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'change');
		this.change = events.change
			.debounceTime(200)
			.startWith('')
			.switchMap(value => fetchSuggestions(this.props.datasets, value))
			.subscribe(suggestions => this.setState({suggestions}));
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	onChange = (ev, value) => {
		if (value) {
			this.props.onSelect(value);
			this.setState({inputValue: getOptionLabel(value)});
		}
	};

	onInputChange = (ev, inputValue/*, reason*/) => {
		this.setState({inputValue});
		this.on.change(inputValue);
	}

	onReset = () => {
		var {value} = this.props;
		if (value) {
			this.setState({inputValue: getOptionLabel(value)});
		}
	}

	render() {
		var {onChange, onReset} = this,
			{value, suggestProps} = this.props,
			{suggestions, inputValue} = this.state;

		return autocomplete({
			closeIcon: closeRounded({fontSize: 'large'}),
			forcePopupIcon: !value,
			onChange,
			onClose: onReset,
			getOptionLabel,
			getOptionSelected: isEqual,
			filterOptions,
			onInputChange: this.onInputChange,
			options: suggestions,
			popupIcon: searchRounded({fontSize: 'large'}),
			renderInput: props => xAutosuggestInput({onBlur: onReset,
				...suggestProps, ...props}),
			freeSolo: true,
			clearOnBlur: false,
			inputValue,
			value
		});
	}
}

export default el(GeneDatasetSuggest);
