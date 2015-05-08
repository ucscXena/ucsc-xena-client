/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('underscore_ext');
var Ls = require('lenses/lenses');

function optsFromDatasets(servers) {
	return _.flatmap(servers,
			s => _.map(s.datasets,
				d => ({value: d.dsID, label: d.label})));
}

var DatasetSelect = React.createClass({
	render: function () {
		var {datasets, lens, nullOpt, ...other} = this.props,
			options = (nullOpt ? [{value: null, label: nullOpt}] : [])
				.concat(optsFromDatasets(_.getIn(datasets, ['servers']))),
			selectLens = _.compose(lens, Ls.key('dataset'));

		return (
			<Select
				{...other}
				lens={selectLens}
				options={options}
			/>
		);
	}
});

module.exports = DatasetSelect;
