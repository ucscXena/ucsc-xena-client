'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var XCheckboxGroup = require('./XCheckboxGroup');
var XRadioGroup = require('./XRadioGroup');
var GeneSuggest = require('./GeneSuggest');
var PhenotypeSuggest = require('./PhenotypeSuggest');

const LOCAL_DOMAIN = 'https://local.xena.ucsc.edu:7223';
const LOCAL_DOMAIN_LABEL = 'My Computer Hub';

const ignoredType = ['probeMap', 'genePredExt', 'probemap', 'sampleMap']; // Important for unassigned cohort
const ignoredSubtype = ['Filter', 'filter', 'phenotype', 'phenotypes', 'Phenotype', 'Phenotypes']; // XXX Looks brittle. use regex?

var notIgnored = ({type, dataSubType}) => !_.contains(ignoredType, type) && !_.contains(ignoredSubtype, dataSubType);

var category = ({dsID, dataSubType}) =>
	dsID.includes(LOCAL_DOMAIN) ? LOCAL_DOMAIN_LABEL : (dataSubType ? dataSubType : 'others');

function createLabels(datasets) {
	var sorted = _.sortBy(datasets, ds => ds.label.toLowerCase()),
		labels = _.uniquify(_.pluck(sorted, 'label'));
	return _.mmap(sorted, labels, ({dsID}, label) => ({value: dsID, label}));
}

// Create dataset list. Sorts by category and label, and enforces unique labels by
// appending a suffix.
function datasetList(datasets) {
	var groups = _.fmap(_.groupBy(_.values(datasets).filter(notIgnored), category),
		createLabels);
	return _.sortBy(_.keys(groups), g => g.toLowerCase()).map(group => ({
		label: group,
		options: groups[group]
	}));
}

var preferredList = preferred => ([
	{
		options: preferred.map(({dsID, label}) => ({value: dsID, label}))
	}
]);

var RETURN = 13;
var returnPressed = cb => ev => ev.keyCode === RETURN && cb();

function selectedOptions(selected, options) {
	var smap = new Set(selected);
	return options.map(group =>
			_.updateIn(group, ['options'],
				options => options.map(opt => smap.has(opt.value) ?
					_.assoc(opt, 'checked', true) : opt)));
}

var GenotypicForm = props => (
	<div>
		<label>Genes, Identifiers, or Coordinates</label><br/>
		<GeneSuggest value={props.value} onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} inputRef={props.inputRef} type='text'/>
		<br/>
		<XCheckboxGroup
			label='Assay Type'
			additionalAction={!_.isEmpty(props.preferred) && (props.advanced ? 'Show Basic' : 'Show Advanced')}
			onAdditionalAction={props.onAdvancedClick}
			onChange={props.onChange}
			options={selectedOptions(props.selected,
				props.advanced ? datasetList(props.datasets) :
					preferredList(props.preferred))}/>
	</div>);

var PhenotypicForm = props => (
	<div>
		<label>Phenotype</label>
		<PhenotypeSuggest value={props.value} features={props.features} onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} inputRef={props.inputRef} type='text'/>
	</div>);

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm
};

var isValid = {
	Genotypic: (value, selected) => value.trim().length > 0 && selected.length > 0,
	Phenotypic: (value, selected, features) => _.findWhere(features, {label: value})
};

var VariableSelect = React.createClass({
	getInitialState() {
		var {preferred, mode = 'Genotypic'} = this.props;
		return {
			mode,
			advanced: _.isEmpty(preferred),
			selected: {
				true: [], // advanced
				false: [] // !advanced
			},
			value: {
				Genotypic: '',
				Phenotypic: ''
			},
			valid: false // XXX if selections are passed, we need to compute this
		};
	},
	onModeChange(value) {
		this.setState({mode: value});
	},
	onAdvancedClick() {
		this.setState({advanced: !this.state.advanced});
	},
	setInput(input) {
		this.input = input;
	},
	onChange(selectValue, isOn) {
		var {props: {features}, state: {mode, advanced}} = this,
			value = this.state.value[mode],
			oldSelected = this.state.selected[advanced],
			selected = (isOn ? _.conj : _.without)(oldSelected, selectValue);

		this.setState({
			valid: isValid[mode](value, selected, features),
			selected: _.assoc(this.state.selected, advanced, selected)
		});
	},
	onFieldChange(value) {
		var {props: {features}, state: {mode, advanced}} = this,
			selected = this.state.selected[advanced];
		this.setState({
			valid: isValid[mode](value, selected, features),
			value: _.assoc(this.state.value, mode, value)
		});
	},
	onDone() {
		var {features, pos, onSelect} = this.props,
			{mode, advanced, valid} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[advanced];

		if (valid) {
			if (mode === 'Genotypic') {
				onSelect(pos, value, selected);
			} else {
				let feature = _.findWhere(features, {label: value});
				onSelect(pos, feature.value, [feature.dsID]);
			}
		}
	},
	render() {
		var {mode, advanced, valid} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[advanced],
			{datasets, features, preferred} = this.props,
			ModeForm = getModeFields[mode];
		var dataTypeProps = {
			label: 'Data Type',
			value: mode,
			onChange: this.onModeChange,
			options: [
				{
					label: 'Genotypic',
					value: 'Genotypic'
				}, {
					label: 'Phenotypic',
					value: 'Phenotypic'
				}
			]
		};
		return (
			<div>
				<XRadioGroup {...dataTypeProps} />
				<ModeForm
					inputRef={this.setInput}
					onChange={this.onChange}
					onReturn={this.onDone}
					onFieldChange={this.onFieldChange}
					datasets={datasets}
					selected={selected}
					value={value}
					features={features}
					preferred={preferred}
					onAdvancedClick={this.onAdvancedClick}
					advanced={advanced}/>
				<button disabled={!valid} onClick={this.onDone}>Done</button>
			</div>);
	}
});

module.exports = VariableSelect;
