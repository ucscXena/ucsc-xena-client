'use strict';
var React = require('react');
var CohortSelect = require('./CohortSelect');
var DiseaseSuggest = require('./DiseaseSuggest2');

var CohortOrDisease = React.createClass({
	getInitialState() {
		return {mode: 'cohort', cohort: null};
	},
	onChange(ev) {
		this.setState({mode: ev.target.value});
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
				<input
					ref='cohort'
					onChange={this.onChange}
					type='radio' name='cohort-mode' value='cohort'
					checked={mode === 'cohort'}/>I know the study I want<br/>
				<input
					ref='cohort'
					onChange={this.onChange}
					type='radio' name='cohort-mode' value='disease'
					checked={mode !== 'cohort'}/>Help me find a study<br/>

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
