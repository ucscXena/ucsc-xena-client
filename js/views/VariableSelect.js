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

var GenotypicForm = props => (
	<div>
		<label>Genes, Identifiers, or Coordinates</label><br/>
		<input ref={props.inputRef} type='text'/>
		<br/>
		<XCheckboxGroup
			label='Assay Type'
			additionalAction={props.advanced ? 'Show Basic' : 'Show Advanced'}
			onAdditionalAction={props.onAdvancedClick}
			onSelect={props.onSelect}
			options={props.advanced ? datasetList(props.datasets) :
				preferredList(props.preferred)}/>
	</div>);

var PhenotypicForm = props => (
	<div>
		<label>Phenotype</label>
		<input ref={props.inputRef} type='text'/>
	</div>);

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm
};

var VariableSelect = React.createClass({
	getInitialState() {
		return {mode: 'Genotypic', advanced: false};
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
	onSelect(dataset) {
		this.props.onSelect(this.input.value, dataset);
	},
	render() {
		// XXX If there are no preferred datasets, e.g. for
		// unassigned cohort, we should coerce to advanced mode,
		// and hide/disable the 'Show Basic' button.
		var {mode, advanced} = this.state,
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
					onSelect={this.onSelect}
					datasets={datasets}
					preferred={preferred}
					onAdvancedClick={this.onAdvancedClick}
					advanced={advanced}/>
				<button>Done</button>
			</div>);
	}
});

module.exports = VariableSelect;
