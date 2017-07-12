'use strict';

var React = require('react');
var BasicDatasetSelect = require('./BasicDatasetSelect');
var AdvancedDatasetSelect = require('./AdvancedDatasetSelect');

var GenotypicForm = props => {
	let DatasetSelect = props.advanced ? AdvancedDatasetSelect : BasicDatasetSelect;
	return (
		<div>
			<label>Genes, Identifiers, or Coordinates</label><br/>
			<input ref={props.inputRef} type='text' /><br/>
			<label>Assay Type</label>
			<button onClick={props.onAdvancedClick}>Show {props.advanced ? 'Basic' : 'Advanced'}</button>
			<DatasetSelect onSelect={props.onSelect} datasets={props.datasets} preferred={props.preferred}/>
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
	onModeChange(ev) {
		this.setState({mode: ev.target.value});
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
				<label>Data Type</label><br/>
				<input
					type='radio'
					onChange={this.onModeChange}
					checked={mode === 'Genotypic'}
					name='data-mode'
					value='Genotypic'/>
				<label>Genotypic</label><br/>
				<input
					type='radio'
					onChange={this.onModeChange}
					checked={mode === 'Phenotypic'}
					name='data-mode'
					value='Phenotypic'/>
				<label>Phenotypic</label><br/>
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
