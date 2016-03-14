/**
 * Created by albertwchang on 3/16/16.
 */
/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('./underscore_ext');
var {deepPureRenderMixin} = require('./react-utils');

var SpliceSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	getDefaultProps: function() {
		return {showLabel: true}
	},
	render: function () {
		var {cohort, cohorts, callback, showLabel, ...other} = this.props,
			sortedCohorts = _.sortBy(cohorts, (cohort) => cohort.toLowerCase()),
			options = _.map(sortedCohorts, c => ({value: c, label: c}));

		return (
			<div className='form-group'>
				{label}
				<Select event='cohort' callback={callback}
						value={cohort} options={options}{...other}/>
			</div>
		);
	}
});

module.exports = SpliceSelect;
