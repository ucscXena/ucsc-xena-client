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
			(dataset, matches) => matches.map(gene => ({gene,  ...dataset})))
			.flat());

var getOptionLabel = ({gene, dataSubType}) => `${gene} - ${dataSubType}`;
var filterOptions = (options, {inputValue}) =>
	options.filter(({gene}) =>
		gene.toLowerCase().startsWith(inputValue.trim().toLowerCase()));

export class GeneDatasetSuggest extends PureComponent {
	state = {suggestions: []};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'change');
		this.change = events.change
			.debounceTime(200)
			.switchMap(value => value === undefined ? empty : fetchSuggestions(this.props.datasets, value))
			.subscribe(suggestions => this.setState({suggestions}));
	}

	componentWillUnmount() {
		this.change.unsubscribe();
	}

	onChange = (ev, value) => {
		this.props.onSelect(value);
	};

	onInputChange = (ev, value/*, reason*/) => {
		this.on.change(value);
	}

	render() {
		var {onChange} = this,
			{value, suggestProps} = this.props,
			{suggestions} = this.state;
		return autocomplete({
			closeIcon: closeRounded({fontSize: 'large'}),
			forcePopupIcon: !value,
			onChange,
			getOptionLabel,
			getOptionSelected: isEqual,
			filterOptions,
			onInputChange: this.onInputChange,
			options: suggestions,
			popupIcon: searchRounded({fontSize: 'large'}),
			renderInput: props => xAutosuggestInput({...suggestProps, ...props}),
			value
		});
	}
}

export default el(GeneDatasetSuggest);
