'use strict';
var React = require('react');
var CohortSelect = require('./CohortSelect');
var DiseaseSuggest = require('./DiseaseSuggest2');
import {RadioButton} from 'react-toolbox/lib/radio';
var XRadioGroup = require('./XRadioGroup');
var XInputToolbar = require('./XInputToolbar');

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
		return (
			<div>
				<XRadioGroup value={mode} onChange={this.onChange}>
					<XInputToolbar label='Study Discovery'/>
					<RadioButton label='Help me select a study' value='disease'/>
					<RadioButton label='I know the study I want to use' value='cohort'/>
				</XRadioGroup>
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
