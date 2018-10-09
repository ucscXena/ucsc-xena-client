'use strict';

import PureComponent from '../PureComponent';
var React = require('react');
import Input from 'react-toolbox/lib/input';
var _ = require('../underscore_ext');
require('./GeneSuggest.css'); // XXX rename file
var lcs = require('../lcs');
import XAutosuggest from './XAutosuggest';
var XRadioGroup = require('./XRadioGroup');

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

var renderInputComponent = ({ref, onChange, ...props}) => (
	<Input
		spellCheck={false}
		innerRef={el => ref(el && el.inputNode)}
		onChange={(value, ev) => onChange(ev)}
		label='Primary Disease or Tissue of Origin'
		{...props} />);

class DiseaseSuggest extends PureComponent {
	state = {suggestions: [], value: ""};

	onSuggestionsFetchRequested = ({value}) => {
		var position = this.input.selectionStart,
			word = currentWord(value, position),
			lcValue = word.toLowerCase(),
			{cohortMeta} = this.props,
			tags = Object.keys(cohortMeta);
		this.setState({
			suggestions: _.filter(tags, t => t.toLowerCase().indexOf(lcValue) === 0)
		});
	};

	onSuggestionsClearRequested = () => {
		this.setState({suggestions: []});
	};

	onChange = (ev, {newValue, method}) => {
		// Don't update the value for 'up' and 'down' keys. If we do update
		// the value, it gives us an in-place view of the suggestion (pasting
		// the value into the input field), but the drawback is that it moves
		// the cursor to the end of the line. This messes up multi-word input.
		// We could try to preserve the cursor position, perhaps by passing a
		// custom input renderer. But for now, just don't update the value for
		// these events.
		if (method !== 'up' && method !== 'down') {
			this.setState({value: newValue});
		}
	};

	onSelect = (ev, {suggestionValue}) => {
		this.setState({value: suggestionValue});
	};

	onClear = () => {
		this.setState({value: ""});
	};

	onCohort = (value) => {
		this.props.onSelect(value);
	};

	shouldRenderSuggestions = () => true;

	getSuggestionValue = (suggestion) => {
		var position = this.input.selectionStart,
			value = this.input.value,
			[i, j] = currentWordPosition(value, position);

		// splice the suggestion into the current word
		return value.slice(0, i) + suggestion + value.slice(j);
	};

	setInput = (input) => {
		this.input = input;
	};

	render() {
		var {onChange} = this,
			{suggestions, value} = this.state,
			{cohortMeta, cohort} = this.props,
			results = matchSimplified(cohortMeta, value);
		var buildStudyDebugLabel = function(c, weight, groups) {
			var groupsText = groups.map(({tag, weight}) => `${tag.join(' ')} ${weight.toPrecision(2)}`);
			return `${c} [${weight.toPrecision(2)} ${groupsText}]`;
		};
		var studyProps = {
			label: 'Study',
			value: cohort,
			onChange: this.onCohort,
			options: results.map(({cohort: c, weight, groups}) => {
				return {
					label: DEBUG ? buildStudyDebugLabel(c, weight, groups) : c,
					value: c
				};
			})
		};
		return (
			<div>
				<XAutosuggest
					inputRef={this.setInput}
					suggestions={suggestions}
					onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
					onSuggestionsClearRequested={this.onSuggestionsClearRequested}
					onSuggestionSelected={this.onSelect}
					getSuggestionValue={this.getSuggestionValue}
					shouldRenderSuggestions={this.shouldRenderSuggestions}
					renderSuggestion={v => <span>{v}</span>}
					renderInputComponent={renderInputComponent}
					inputProps={{value, onChange}}
					value={value}
					onClear={this.onClear}/>
				{results.length > 0 ? <XRadioGroup {...studyProps} /> : null}
			</div>);
	}
}

module.exports = DiseaseSuggest;
