'use strict';

var React = require('react');
import Autosuggest from 'react-autosuggest';
var {sparseDataMatchPartialField, refGene} = require('../xenaQuery');
var _ = require('../underscore_ext');
var {rxEventsMixin} = require('../react-utils');
require('./GeneSuggest.css');
var limit = 8;

// Currently we only match against refGene hg38 genes. We could, instead, match
// on specific datasets (probemap, mutation, segmented, refGene), but that will
// require some more work to dispatch the query for each type.
var GeneSuggest = React.createClass({
	mixins: [rxEventsMixin],
	componentWillMount() {
		var {host, name} = refGene.hg38;
		this.events('change');
		this.ev.change
			.distinctUntilChanged(_.isEqual)
			.debounceTime(200)
			.switchMap(value => sparseDataMatchPartialField(host, 'name2', name, value, limit)).subscribe(matches => this.setState({suggestions: matches}));
	},
	onSuggestionsFetchRequested({value}) {
		this.ev.change.next(value);
	},
	onSuggestionsClearRequested() {
		this.setState({suggestions: []});
	},
	getInitialState() {
		return {suggestions: []};
	},
	onChange(ev, {newValue}) {
		this.props.onChange(newValue);
	},
	render() {
		var {onChange} = this,
			{suggestions} = this.state,
			{value = ""} = this.props;
		return (
			<Autosuggest
				suggestions={suggestions}
				onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
				onSuggestionsClearRequested={this.onSuggestionsClearRequested}
				getSuggestionValue={x => x}
				renderSuggestion={v => <span>{v}</span>}
				inputProps={{value, onChange}}/>);
	}
});

module.exports = GeneSuggest;
