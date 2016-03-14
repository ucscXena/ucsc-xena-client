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

<<<<<<< 34ca75fcf82b2d55a69e2abac0fa9cbc9e73cb4b
function optsFromDatasets(dataSubTypes) {
	return _.flatten(_.sortBy(Object.keys(dataSubTypes), el=>el.toLowerCase()).map(function(dataSubType){
		var datasets = dataSubTypes[dataSubType],
			sortedOpts = sortByLabel(filterDatasets(datasets)).map(d => ({value: d.dsID, label: d.label}));
		return [{label: dataSubType, header: true}].concat(sortedOpts);
	}));
=======


function optsFromDatasets(servers) {
	return _.flatmap(servers, (datasets, server) => {
		let sortedOpts = sortByLabel(filterDatasets(datasets)).map(d =>
			({value: d.dsID, label: d.label}));
		return [{label: header(server), header: true}].concat(sortedOpts);
	});
>>>>>>> - Created Navigation component to manage state and behavior and presentation of buttons
}

var DatasetSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {children, datasets, nullOpt, ...other} = this.props,
			options = (nullOpt ? [{value: null, label: nullOpt}] : [])
<<<<<<< 34ca75fcf82b2d55a69e2abac0fa9cbc9e73cb4b
				.concat(optsFromDatasets(_.groupBy(datasets, 'dataSubType')))
=======
				.concat(optsFromDatasets(_.groupBy(datasets, 'server')));

		let label = (children && !_.isArray(this.props.children)) ? children
			: <label className='datasetAnchor'>Dataset: </label>;
>>>>>>> - Created Navigation component to manage state and behavior and presentation of buttons

		return (
			<div className='form-group'>
				{label}
				<Select {...other}  options={options} />
			</div>
		);
	}
});

module.exports = DatasetSelect;
