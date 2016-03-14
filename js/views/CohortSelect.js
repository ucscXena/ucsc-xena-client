/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');

var CohortSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {children, cohort, cohorts, ...other} = this.props,
			sortedCohorts = _.sortBy(cohorts, (cohort) => cohort.toLowerCase()),
			options = _.map(sortedCohorts, c => ({value: c, label: c}));
		let label = (children && !_.isArray(this.props.children)) ? children
			: <label className='cohortAnchor'>Cohort: </label>;

		return (
			<div className='form-group'>
				{label}
				<Select value={cohort} options={options} {...other}/>
			</div>
		);
	}
});

module.exports = CohortSelect;