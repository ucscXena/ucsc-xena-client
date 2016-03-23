/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');

var CohortSelect = React.createClass({
	name: 'Cohort',
	mixins: [deepPureRenderMixin],
	render: function () {
		var {cohort, cohorts, makeLabel, ...other} = this.props,
			sortedCohorts = _.sortBy(cohorts, (cohort) => cohort.toLowerCase()),
			options = _.map(sortedCohorts, c => ({value: c, label: c})),
		//let label = (children && !_.isArray(this.props.children)) ? children
		//	: <label className='cohortAnchor'>Cohort: </label>;
			label = !makeLabel ? <label className="control-label">{this.name}:</label>
				: makeLabel(cohort ? `${this.name} chosen` : `Select a ${this.name}`);

		return (
			<div className='form-group'>
				{label}
				{' '}
				<Select allowSearch={true} options={options} {...other} value={cohort}/>
			</div>
		);
	}
});

module.exports = CohortSelect;