/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('underscore_ext');
var Rx = require('rx.ext');
var xenaQuery = require('xenaQuery');
var L = require('lenses/lens');
var Ls = require('lenses/lenses');
var propsStream = require('./react-utils').propsStream;

require('react-select/dist/default.css');

var CohortSelect = React.createClass(propsStream({
	componentWillMount: function () {
		this.propsStream.getIn(['servers', 'user']).distinctUntilChanged()
			.map(servers => Rx.Observable.zipArray(_.map(servers, xenaQuery.all_cohorts)))
			.switchLatest()
			.map(_.apply(_.union))
			.startWith([])
			.subscribe(cohorts => this.setState({cohorts: cohorts}));
	},
	render: function () {
		var options = _.map(this.state.cohorts, c => ({value: c, label: c})),
			selectLens = L.compose(this.props.lens, Ls.key('cohort'));
		return (
			<div className='form-group'>
				<label className='cohortAnchor'>Cohort</label>
				{' '}
				<Select
					lens={selectLens}
					options={options}
				/>
			</div>
		);
	}
}));

module.exports = CohortSelect;
