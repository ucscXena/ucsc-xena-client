/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('underscore_ext');
var xenaQuery = require('./xenaQuery');
var {deepPureRenderMixin} = require('./react-utils');

// group header for a server
var header = s => xenaQuery.server_url(s.server);

function optsFromDatasets(servers) {
	return _.flatmap(servers, (s) => {
		let sortedOpts = _.sortBy(_.map(s.datasets, d => ({value: d.dsID, label: d.label})), option => option.label.toLowerCase());
		return [{label: header(s), header: true}].concat(sortedOpts);
	});
}

var DatasetSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {datasets, nullOpt, ...other} = this.props,
			options = (nullOpt ? [{value: null, label: nullOpt}] : [])
				.concat(optsFromDatasets(_.getIn(datasets, ['servers'])));

		return (
			<Select {...other}  options={options} />
		);
	}
});

module.exports = DatasetSelect;
