/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('underscore_ext');
var L = require('lenses/lens');
var Ls = require('lenses/lenses');

// XXX Use lens to pass in 'samplesFrom' value, so this module is reusable.

function optsFromDatasets(servers) {
	return _.flatmap(servers,
			s => _.map(s.datasets,
				d => ({value: d.dsID, label: d.label})));
}

var DatasetSelect = React.createClass({
	render: function () {
		var options = optsFromDatasets(_.getIn(this.props, ['datasets', 'servers'])),
			selectLens = L.compose(this.props.lens, Ls.key('samplesFrom'));

		return (
			<div className='form-group' style={this.props.style}>
				<label className='datasetSelectLabel'> Samples in </label>
				{' '}
				<Select
					lens={selectLens}
					options={options}
				/>
			</div>
		);
	}
});

module.exports = DatasetSelect;
