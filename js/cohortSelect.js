/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('underscore_ext');
var {deepPureRenderMixin} = require('./react-utils');
require('react-select/dist/default.css');

var CohortSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {cohort, cohorts, callback} = this.props,
			options = _.map(cohorts, c => ({value: c, label: c}));
		return (
			<div className='form-group'>
				<label className='cohortAnchor'>Cohort</label>
				{' '}
				<Select
					event='cohort'
					callback={callback}
					value={cohort}
					options={options}
				/>
			</div>
		);
	}
});

module.exports = CohortSelect;
