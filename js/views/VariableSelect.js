'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var XCheckboxGroup = require('./XCheckboxGroup');
var XRadioGroup = require('./XRadioGroup');

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
		<input onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} ref={props.inputRef} type='text'/>
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
		<input onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} ref={props.inputRef} type='text'/>
	</div>);

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm
};

var isValid = (value, selected) => value.trim().length > 0 && selected.length > 0;

var VariableSelect = React.createClass({
	getInitialState() {
		return {mode: 'Genotypic', advanced: false, valid: false};
	},
	onModeChange(value) {
		this.setState({mode: value});
	},
	onAdvancedClick() {
		this.setState({advanced: !this.state.advanced});
	},
	setInput(el) {
		this.input = el;
	},
	onChange(selected) {
		this.selected = selected;
		this.setState({valid: isValid(this.input.value, selected)});
	},
	onFieldChange() {
		this.setState({valid: isValid(this.input.value, this.selected || [])});
	},
	onDone() {
		if (this.state.valid) {
			this.props.onSelect(this.props.pos, this.input.value, this.selected);
		}
	},
	render() {
		// XXX If there are no preferred datasets, e.g. for
		// unassigned cohort, we should coerce to advanced mode,
		// and hide/disable the 'Show Basic' button.
		var {mode, advanced, valid} = this.state,
			{datasets, preferred} = this.props,
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
					preferred={preferred}
					onAdvancedClick={this.onAdvancedClick}
					advanced={advanced}/>
				<button disabled={!valid} onClick={this.onDone}>Done</button>
			</div>);
	}
});

module.exports = VariableSelect;
