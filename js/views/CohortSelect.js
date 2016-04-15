/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');

var CohortSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {cohort, cohorts, onSelect} = this.props,
			sortedCohorts = _.sortBy(cohorts, (cohort) => cohort.toLowerCase()),
			options = _.map(sortedCohorts, c => ({value: c, label: c}));

		return (
			<div className="text-left">
				<label className='cohortAnchor'>
					<b>Cohort</b>
				</label>
				{' '}
				<Select onSelect={onSelect} value={cohort} options={options} charLimit={25}/>
			</div>
		);
	}
});

module.exports = CohortSelect;
