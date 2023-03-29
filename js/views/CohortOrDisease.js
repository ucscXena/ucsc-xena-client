var React = require('react');
import {Box} from '@material-ui/core';
import {CohortSuggest} from './CohortSuggest';
var DiseaseSuggest = require('./DiseaseSuggest2');
var XRadioGroup = require('./XRadioGroup');
var {WizardCard} = require('./WizardCard');

class CohortOrDisease extends React.Component {
	state = {mode: 'cohort', cohort: null, matchedCohorts: []};

	onChange = (value) => {
		this.setState({mode: value, cohort: null, matchedCohorts: []});
	};

	onDone = () => {
		this.props.onSelect(this.state.cohort);
	};

	onSelectCohort = (cohort) => {
		this.setState({cohort});
	};

	onSelectDiseaseOrTissue = (matchedCohorts) => {
		this.setState({cohort: null, matchedCohorts});
	};

	render() {
		var {mode, cohort, matchedCohorts} = this.state,
			{cohorts = [], cohortMeta, width} = this.props;
		var cohortSuggestProps = {
			formLabel: 'Study',
			placeholder: 'Select Study',
		};
		var diseaseSuggestProps = {
			formLabel: 'Primary Disease or Tissue of Origin',
			placeholder: 'Select Disease or Tissue',
		};
		var studyDiscoveryProps = {
			label: 'Study Discovery',
			value: mode,
			onChange: this.onChange,
			options: [{label: 'I know the study I want to use', value: 'cohort'}, {label: 'Help me select a study', value: 'disease'}]
		};
		var wizardProps = {
			colId: 'A',
			colMode: 'WIZARD',
			onDone: this.onDone,
			title: 'Select a Study to Explore',
			valid: !!cohort,
			width
		};
		return (
			<WizardCard {...wizardProps}>
				<XRadioGroup {...studyDiscoveryProps} />
				<Box sx={{display: 'flex', flexDirection: 'column', gridGap: 16}}>
					{mode === 'disease' && <DiseaseSuggest cohortMeta={cohortMeta} onSelect={this.onSelectDiseaseOrTissue} suggestProps={diseaseSuggestProps}/>}
					<CohortSuggest cohort={cohort} cohorts={mode === 'disease' ? matchedCohorts : cohorts} onSelect={this.onSelectCohort} suggestProps={cohortSuggestProps}/>
				</Box>
			</WizardCard>);
	}
}

module.exports = CohortOrDisease;
