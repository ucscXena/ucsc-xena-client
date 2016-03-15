/*global require: false, module: false */
'use strict';
var React = require('react');
var Select = require('./Select');
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');
var {deepPureRenderMixin} = require('../react-utils');

// group header for a server
var header = s => xenaQuery.server_url(s);

var ignored = ['probeMap', 'genePredExt', 'probemap', 'sampleMap', 'genomicSegment'];
var notIgnored = ds => !_.contains(ignored, ds.type);
var loaded = ds => ds.status === 'loaded';

var filterDatasets = list => list.filter(ds => notIgnored(ds) && loaded(ds));
var sortByLabel = list => _.sortBy(list, el => el.label.toLowerCase());



function optsFromDatasets(servers) {
	return _.flatmap(servers, (datasets, server) => {
		let sortedOpts = sortByLabel(filterDatasets(datasets)).map(d => ({value: d.dsID, label: d.label}));
		return [{label: header(server), header: true}].concat(sortedOpts);
	});
}

var DatasetSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {datasets, nullOpt, ...other} = this.props,
			options = (nullOpt ? [{value: null, label: nullOpt}] : [])
				.concat(optsFromDatasets(_.groupBy(datasets, 'server')))

		return (
			<Select {...other}  options={options} />
		);
	}
});

module.exports = DatasetSelect;
