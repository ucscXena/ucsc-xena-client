/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./views/Select');
var _ = require('./underscore_ext');
var {deepPureRenderMixin} = require('./react-utils');

var CohortSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {cohort, cohorts, callback, ...other} = this.props,
			sortedCohorts = _.sortBy(cohorts, (cohort) => cohort.toLowerCase()),
			options = _.map(sortedCohorts, c => ({value: c, label: c}));

		return (
			<div className='form-group'>
				<label className='cohortAnchor'>Cohort</label>
				{' '}
				<Select
					value={cohort}
					options={options}
					{...other}
				/>
			</div>
		);
	}
});

module.exports = CohortSelect;
