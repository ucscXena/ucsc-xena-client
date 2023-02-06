
import PureComponent from '../PureComponent';
import {CloseRounded, SearchRounded} from '@material-ui/icons';
import Autocomplete from '@material-ui/lab/Autocomplete';
import {Box} from '@material-ui/core';
var React = require('react');
var _ = require('../underscore_ext').default;
var lcs = require('../lcs');
import XAutosuggestInput from './XAutosuggestInput';

// Styles
var sxAutocomplete = {
	'& .MuiAutocomplete-clearIndicator': {
		visibility: 'visible'
	}
};

function toLCWords(str) {
	return str.toLowerCase().split(/[ \t]/);
}

function applyBias(bias, x) {
	return x > 0 ? (x - 1) * bias + 1 : 0;
}

// tag and input are ordered lists of words, from strings that have
// been normalized to lower case, and split on whitespace.
//
// We count each word match. We count multiple word matches more
// strongly than a sum of the word matches. We count ordered
// word matches more strongly than multiple word matches

var multiWordBias = 1.5,
	orderBias = 1.7;
function scoreTag(tag, input) {
	var matches =  _.intersection(tag, input),
		wordBiased = applyBias(multiWordBias, matches.length),
		ordered = matches.length > 0 ? lcs(tag, input) : 0;

	return wordBiased * applyBias(orderBias, ordered);
}

function scoreCohorts(cohortMeta, tags, weights) {
	return tags.reduce((cohorts, tag, i) => {
		var w = weights[i];
		if (w > 0) {
			cohortMeta[tag].forEach(cohort =>
				cohorts[cohort] = (cohorts[cohort] || 0) + w);
		}
		return cohorts;
	}, {});
}

// Return list of cohorts ordered by strength of match to input.
function match(cohortMeta, input) { //eslint-disable-line no-unused-vars
	var tags = Object.keys(cohortMeta),
		normInput = toLCWords(input),
		normTags = tags.map(toLCWords),
		weights = normTags.map(t => scoreTag(t, normInput)),
		cohortScores = scoreCohorts(cohortMeta, tags, weights);

	return Object.keys(cohortScores).sort((c, d) => cohortScores[d] - cohortScores[c]);
}

function scoreTag2(tag, input) {
	var matches =  _.intersection(tag, input),
		wordBiased = applyBias(multiWordBias, matches.length),
		ordered = matches.length > 0 ? lcs(tag, input) : 0;

	return {matches: matches.sort(), tag, weight: wordBiased * applyBias(orderBias, ordered)};
}

// For each set of matched input words, pick the highest-scoring match
function scoreCohorts2(cohortMeta, tags, weights) { //eslint-disable-line no-unused-vars
	var byCohort = _.groupBy(_.flatmap(cohortMeta, (cohorts, tag) =>
			cohorts.map(cohort => ({cohort, tag}))), 'cohort'),
		tagWeights = _.object(tags, weights),
		cohortWeights = _.map(byCohort, (cohortTags, cohort) => {
			var cohortTagWeights = _.pick(tagWeights, _.pluck(cohortTags, 'tag')),
				groups = _.map(_.groupBy(cohortTagWeights, 'matches'),
					weights => _.maxWith(weights, (x, y) => x.weight - y.weight)).filter(({weight}) => weight > 0);
			return {cohort, weight: _.sum(_.pluck(groups, 'weight')), groups};
		});
	return _.sortBy(cohortWeights.filter(({weight}) => weight > 0), ({weight}) => -weight);
}

// For each set of matched input words, pick the highest-scoring match,
// scale by number of matches for the set / total tag count for the cohort
function scoreCohorts3(cohortMeta, tags, weights) { //eslint-disable-line no-unused-vars
	var byCohort = _.groupBy(_.flatmap(cohortMeta, (cohorts, tag) =>
			cohorts.map(cohort => ({cohort, tag}))), 'cohort'),
		tagWeights = _.object(tags, weights),
		cohortWeights = _.map(byCohort, (cohortTags, cohort) => {
			var cohortTagWeights = _.pick(tagWeights, _.pluck(cohortTags, 'tag')),
				groups = _.map(_.groupBy(cohortTagWeights, 'matches'),
					weights => _.updateIn(_.maxWith(weights, (x, y) => x.weight - y.weight), ['weight'], w => w * weights.length / Math.sqrt(cohortTags.length))).filter(({weight}) => weight > 0);
			return {cohort, weight: _.sum(_.pluck(groups, 'weight')), groups};
		});
	return _.sortBy(cohortWeights.filter(({weight}) => weight > 0), ({weight}) => -weight);
}

// XXX
var DEBUG = false;
//var scoreFn = scoreCohorts2;
var scoreFn = scoreCohorts3;
// XXX

function matchSimplified(cohortMeta, input) {
	var tags = Object.keys(cohortMeta),
		normInput = toLCWords(input),
		normTags = tags.map(toLCWords),
		weights = normTags.map(t => scoreTag2(t, normInput));

	//return scoreFn(cohortMeta, tags, weights);

	// cohort's matching weight is linearly normalized (multiplication) by the number of normalized input found divided by the length of the inputs
	var ma = scoreFn(cohortMeta, tags, weights);
	ma.map(maObj => {
		var matchedPerCohort = _.flatten(maObj.groups.map(g => g.matches));
		var foundLength = normInput.filter(i => matchedPerCohort.indexOf(i) !== -1).length;
		maObj.weight = maObj.weight * foundLength / normInput.length;
	});
	ma = _.sortBy(ma, maObj => maObj.weight).reverse();
	return ma;
}

// match by logical AND, instead of a scoring system
function matchExact(cohortMeta, input) { //eslint-disable-line no-unused-vars
	var tags = Object.keys(cohortMeta),
		normInput = toLCWords(input),
		matches = tags.filter(tag => _.contains(normInput, tag.toLowerCase()));
	return _.intersection(...matches.map(t => cohortMeta[t]));
}

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

var renderInputComponent = ({ref, ...props}) => <XAutosuggestInput inputRef={el => ref(el)} {...props} />;

class DiseaseSuggest extends PureComponent {
	state = {value: null};

	setInputRef = ref => {
		this.inputRef = ref;
	}

	getMatchedCohorts = (value) => {
		if (!value) {
			return [];
		}
		var results = matchSimplified(this.props.cohortMeta, value);
		var buildStudyDebugLabel = function(c, weight, groups) {
			var groupsText = groups.map(({tag, weight}) => `${tag.join(' ')} ${weight.toPrecision(2)}`);
			return `${c} [${weight.toPrecision(2)} ${groupsText}]`;
		};
		return results.map(({cohort: c, weight, groups}) => {
			return {
				label: DEBUG ? buildStudyDebugLabel(c, weight, groups) : c,
				value: c
			};
		}).map(({value}) => value);
	};

	filterOptions = (options, {inputValue}) => {
		var position = this.inputRef.selectionStart;
		var word = currentWord(inputValue, position);
		return _.filter(options, t => t.toLowerCase().indexOf(word.toLowerCase().trim()) === 0);
	};

	// Callback fired when the input value changes.
	onInputChange = (ev, value, reason) => {
		let newValue = value;
		if (reason === 'reset') {
			var currentValue = this.state.value || '';
			var position = this.inputRef.selectionStart;
			var [i, j] = currentWordPosition(currentValue, position);
			newValue = currentValue.slice(0, i) + value + currentValue.slice(j);
		}
		this.setState({value: newValue});
		var matchedCohorts = this.getMatchedCohorts(newValue);
		this.props.onSelect(matchedCohorts);
	}

	render() {
		var {filterOptions, onInputChange} = this,
			{value} = this.state,
			{cohortMeta, suggestProps} = this.props,
			options = Object.keys(cohortMeta);
		return (
			<Box
				component={Autocomplete}
				blurOnSelect={false}
				clearOnBlur={false}
				closeIcon={<CloseRounded fontSize={'large'}/>}
				disableClearable={!value}
				filterOptions={filterOptions}
				forcePopupIcon={!value}
				onInputChange={onInputChange}
				options={options}
				popupIcon={<SearchRounded fontSize={'large'}/>}
				renderInput={(props) => renderInputComponent({...suggestProps, ...props, ref: this.setInputRef, inputProps: {...props.inputProps, value: value || ''}})}
				selectOnFocus={false}
				sx={sxAutocomplete}/>
		);
	}
}

module.exports = DiseaseSuggest;
