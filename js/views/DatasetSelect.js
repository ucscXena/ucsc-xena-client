/*global require: false, module: false */
'use strict';
var React = require('react');
var ButtonGroup = require('react-bootstrap/lib/ButtonGroup');
var Select = require('./Select');
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');
var {deepPureRenderMixin} = require('../react-utils');

// group header for a server
var header = s => xenaQuery.server_url(s);

const ignored = ['probeMap', 'genePredExt', 'probemap', 'sampleMap', 'genomicSegment'];
const exceptions = {
	clinicalMatrix: 'phenotype',
	mutationVector: null,
	genomicMatrix: null
};

var loaded = ds => ds.status === 'loaded';
//var filterDatasets = list => list.filter(ds => notIgnored(ds) && loaded(ds));
//var sortByLabel = list => _.sortBy(list, el => el.label.toLowerCase());

function groupsFromDatasets(datasets, localHubUrl) {
	let dsGroups = {local: {}, remote: {}},
		localGroupKey = 'Your local hub';
	_.each(datasets, (ds, key) => {
		let server = 'remote';
		if (loaded(ds)) {
			let group = '';
			if (JSON.parse(key).host === localHubUrl) {
				group = localGroupKey;
				server = 'local';
			} else {
				group = exceptions[ds.type] || ds.dataSubType;
			}

			// one-time creation of a list
			if (!_.has(dsGroups[server], group)) {
				dsGroups[server][group] = {name: group, options: []};
			}
			dsGroups[server][group].options.push({value: ds.dsID, label: ds.label});
		} else {
			return;
		}
	});
	let localGroup = dsGroups.local[localGroupKey];
	return (localGroup ? [localGroup] : []).concat(
		_.sortBy(dsGroups.remote, (group, name) => name.toLowerCase())
	);
}

var DatasetSelect = React.createClass({
	getInitialState: function() {
		return {}
	},
	mixins: [deepPureRenderMixin],
	render: function () {
		var {children, datasets, localHubUrl, value, ...other} = this.props,
			groups = groupsFromDatasets(datasets, localHubUrl);
		var label = (children && !_.isArray(this.props.children)) ? children
			: <label className='datasetAnchor'>Dataset: </label>;
		return (
			<ButtonGroup stacked className='form-group'>
				{label}
				{_.map(groups, (group) => {
					let header = {header: true, label: group.name},
						groupIsException = _.contains(exceptions, group.name),
						groupWithHeader = groupIsException ? [_.first(group.options)] : [header].concat(group.options),
						choice = _.find(groupWithHeader, ds => ds.value === value) || header;
					return (children || (!children && choice && choice.value)) ? (
						<div key={group.name}>
							<Select {...other} options={groupWithHeader} choice={choice}/>
						</div>
					) : null;
				})}
			</ButtonGroup>
		);
	}
});

module.exports = DatasetSelect;
