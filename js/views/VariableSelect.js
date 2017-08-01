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

var GenotypicForm = props => (
	<div>
		<label>Genes, Identifiers, or Coordinates</label><br/>
		<GeneSuggest onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} inputRef={props.inputRef} type='text'/>
		<br/>
		<XCheckboxGroup
			label='Assay Type'
			additionalAction={props.advanced ? 'Show Basic' : 'Show Advanced'}
			onAdditionalAction={props.onAdvancedClick}
			onChange={props.onChange}
			options={props.advanced ? datasetList(props.datasets) :
				preferredList(props.preferred)}/>
	</div>);

var PhenotypicForm = props => (
	<div>
		<label>Phenotype</label>
		<PhenotypeSuggest features={props.features} onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} inputRef={props.inputRef} type='text'/>
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
		return {mode: 'Genotypic', advanced: false, valid: false};
	},
	onModeChange(value) {
		this.selected = [];
		this.setState({mode: value});
	},
	onAdvancedClick() {
		this.selected = [];
		this.setState({advanced: !this.state.advanced});
	},
	setInput(input) {
		this.input = input;
	},
	onChange(selected) {
		this.selected = selected;
		this.setState({valid: isValid[this.state.mode](this.input.value, selected, this.props.features)});
	},
	onFieldChange(value) {
		this.setState({valid: isValid[this.state.mode](value, this.selected || [], this.props.features)});
	},
	onDone() {
		if (this.state.valid) {
			if (this.state.mode === 'Genotypic') {
				this.props.onSelect(this.props.pos, this.input.value, this.selected);
			} else {
				let feature = _.findWhere(this.props.features, {label: this.input.value});
				this.props.onSelect(this.props.pos, feature.value, [feature.dsID]);
			}
		}
	},
	render() {
		// XXX If there are no preferred datasets, e.g. for
		// unassigned cohort, we should coerce to advanced mode,
		// and hide/disable the 'Show Basic' button.
		var {mode, advanced, valid} = this.state,
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
					features={features}
					preferred={preferred}
					onAdvancedClick={this.onAdvancedClick}
					advanced={advanced}/>
				<button disabled={!valid} onClick={this.onDone}>Done</button>
			</div>);
	}
});

module.exports = VariableSelect;
