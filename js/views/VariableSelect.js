'use strict';

var React = require('react');
var BasicDatasetSelect = require('./BasicDatasetSelect');
var AdvancedDatasetSelect = require('./AdvancedDatasetSelect');
import {RadioButton} from 'react-toolbox/lib/radio';
var XCheckboxGroup = require('./XCheckboxGroup');
var XRadioGroup = require('./XRadioGroup');
var XInputToolbar = require('./XInputToolbar');

var GenotypicForm = props => {
	let DatasetSelect = props.advanced ? AdvancedDatasetSelect : BasicDatasetSelect;
	return (
		<div>
			<label>Genes, Identifiers, or Coordinates</label><br/>
			<input ref={props.inputRef} type='text' /><br/>
			<XCheckboxGroup>
				<XInputToolbar label='Assay Type'
							   additionalAction={props.advanced ? 'Show Basic' : 'Show Advanced'}
							   onAdditionalAction={props.onAdvancedClick}/>
				<DatasetSelect onSelect={props.onSelect} datasets={props.datasets} preferred={props.preferred}/>
			</XCheckboxGroup>
		</div>);
};

var PhenotypicForm = props => (
	<div>
		<label>Phenotype</label>
		<input ref={props.inputRef} type='text' />
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
		return (
			<div>
				<XRadioGroup value={mode} onChange={this.onModeChange}>
					<XInputToolbar label='Data Type'/>
					<RadioButton label='Genotypic' value='Genotypic'/>
					<RadioButton label='Phenotypic' value='Phenotypic'/>
				</XRadioGroup>
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
