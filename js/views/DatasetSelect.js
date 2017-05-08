'use strict';

var React = require('react');
var Select = require('./Select');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');

var ignored = ['probeMap', 'genePredExt', 'probemap', 'sampleMap', 'genomicSegment'];
var sampleFilterDataSubtype = ['Filter', 'filter'];
var notIgnored = ds => !_.contains(ignored, ds.type);
var loaded = ds => ds.status === 'loaded';

var filterDatasets = list => list.filter(ds => notIgnored(ds) && loaded(ds));
var filterDataSubType = list => list.filter(subtype => _.contains(sampleFilterDataSubtype, subtype));
var sortByLabel = list => _.sortBy(list, el => el.label.toLowerCase());

function optsFromDatasets(dataSubTypes) {
	var filterDs = _.flatten(_.sortBy(filterDataSubType(Object.keys(dataSubTypes)),
		el=>el.toLowerCase()).map(function(dataSubType) {
			var datasets = dataSubTypes[dataSubType],
				sortedOpts = sortByLabel(filterDatasets(datasets)).map(d => ({value: d.dsID, label: d.label}));
			return sortedOpts;
		}));
	return filterDs.length ? [{label: "Filter", header: true}].concat(filterDs) : [];
}

var DatasetSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	render: function () {
		var {datasets, nullOpt, ...other} = this.props,
			options = (nullOpt ? [{value: null, label: nullOpt}] : [])
				.concat(optsFromDatasets(_.groupBy(datasets, 'dataSubType')));

		return (
			<Select {...other} options={options} />
		);
	}
});

module.exports = DatasetSelect;
