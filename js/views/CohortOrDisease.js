'use strict';
var React = require('react');
var CohortSuggest = require('./CohortSuggest');
var DiseaseSuggest = require('./DiseaseSuggest2');
var XRadioGroup = require('./XRadioGroup');
var WizardCard = require('./WizardCard');

class CohortOrDisease extends React.Component {
	state = {mode: 'cohort', cohort: null};

	onChange = (value) => {
		this.setState({mode: value, cohort: null});
	};

	onDone = () => {
		this.props.onSelect(this.state.cohort);
	};

	onSelect = (cohort) => {
		this.setState({cohort});
	};

	render() {
		var {mode, cohort} = this.state,
			{cohorts = [], cohortMeta, width} = this.props;
		var studyDiscoveryProps = {
			label: 'Study Discovery',
			value: mode,
			onChange: this.onChange,
			options: [{label: 'Help me select a study', value: 'disease'}, {label: 'I know the study I want to use', value: 'cohort'}]
		};
		var wizardProps = {
			title: 'Study',
			helpText: 'If you would like help determining the data set to use, Xena can suggest data sets if you provide a primary disease or tissue of origin.',
			onDone: this.onDone,
			valid: !!cohort,
			width
		};
		return (
			<WizardCard {...wizardProps}>
				<XRadioGroup {...studyDiscoveryProps} />
				{mode === 'cohort' ?
					<CohortSuggest onSelect={this.onSelect} cohorts={cohorts}
								   cohort={cohort}/> :
					<DiseaseSuggest onSelect={this.onSelect} cohorts={cohorts}
									cohort={cohort} cohortMeta={cohortMeta}/>}
			</WizardCard>);
	}
}

module.exports = CohortOrDisease;
