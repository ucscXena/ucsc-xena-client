var React = require('react');
import {CohortSuggest} from '../views/CohortSuggest';
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
				{mode === 'cohort' ?
					<CohortSuggest onSelect={this.onSelect} cohorts={cohorts}
								   cohort={cohort}/> :
					<DiseaseSuggest onSelect={this.onSelect} cohorts={cohorts}
									cohort={cohort} cohortMeta={cohortMeta}/>}
			</WizardCard>);
	}
}

module.exports = CohortOrDisease;
