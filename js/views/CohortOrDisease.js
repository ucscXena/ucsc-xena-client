'use strict';
var React = require('react');
var CohortSelect = require('./CohortSelect');
var DiseaseSuggest = require('./DiseaseSuggest2');
var XRadioGroup = require('./XRadioGroup');

var CohortOrDisease = React.createClass({
	getInitialState() {
		return {mode: 'cohort', cohort: null};
	},
	onChange(value) {
		this.setState({mode: value});
	},
	onDone() {
		this.props.onSelect(this.state.cohort);
	},
	onSelect(cohort) {
		this.setState({cohort});
	},
	render() {
		var {mode, cohort} = this.state,
			{cohorts, cohortMeta} = this.props;
		var studyDiscoveryProps = {
			label: 'Study Discovery',
			value: mode,
			onChange: this.onChange,
			options: [{
				label: 'Help me select a study',
				value: 'disease'
			}, {
				label: 'I know the study I want to use',
				value: 'cohort'
			}]
		};
		return (
			<div>
				<XRadioGroup {...studyDiscoveryProps} />
				{mode === 'cohort' ?
					<CohortSelect onSelect={this.onSelect} cohorts={cohorts}
						cohort={cohort}/> :
					<DiseaseSuggest onSelect={this.onSelect} cohorts={cohorts}
						cohort={cohort} cohortMeta={cohortMeta}/>}
				<button onClick={this.onDone}>Done</button>
			</div>);
	}
});

module.exports = CohortOrDisease;
