/*global require: false, module: false */
'use strict';
var React = require('react');
var {Accordion, Glyphicon, ListGroup, ListGroupItem, Panel, Well} = require('react-bootstrap/lib');
var Select = require('./Select');
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');
var {deepPureRenderMixin} = require('../react-utils');

// group header for a server
var header = s => xenaQuery.server_url(s);

const ignored = ['probeMap', 'genePredExt', 'probemap', 'sampleMap', 'genomicSegment'];
const exceptions = {
	clinicalMatrix: 'Phenotypes',
	mutationVector: null,
	genomicMatrix: null
};

var loaded = ds => ds.status === 'loaded';
var allowed = ds => _.contains(_.keys(exceptions), ds.type);
var filterDatasets = (list, server) => _.filter(list, (ds, dsID) =>
		allowed(ds) && loaded(ds) && server.includes(JSON.parse(dsID).host));
var groupDatasets = (list, server) => _.groupBy(list, ds =>
		server.includes('local.xena.ucsc.edu') ? 'My Computer Hub'
		: (exceptions[ds.type] && exceptions[ds.type]) || ds.dataSubType);
var metaGroups = groups => _.map(groups, (group, name) => ({name: name, options: shrinkDatasets(group)}));
var shrinkDatasets = list => _.map(list, ds => ({label: ds.label, value: ds.dsID}));
var sortGroups = groups => _.sortBy(groups, (group, name) => name.toLowerCase());
var sortDatasets = keys => _.sortBy(keys, key => key.toLowerCase());
//var sortGroups = groups => _.sortBy(groups, (group) => group.name.toLowerCase());

function groupsFromDatasets(datasets, servers) {
	let groups = _.reduce(servers, (allGroups, hub) => {
		let filteredSets = filterDatasets(datasets, hub),
			groupedSets = groupDatasets(filteredSets, hub),
			sortedNames = sortDatasets(_.keys(groupedSets));
		sortedNames.forEach(groupName => {
			let recordedDs = _.findWhere(allGroups, {name: groupName});
			if (_.isEmpty(recordedDs)) {
				let groupMeta = {
					name: groupName,
					options: shrinkDatasets(groupedSets[groupName])
				};
				allGroups = allGroups.concat([groupMeta]);
			}
		});
		return allGroups;
	}, []);

	return groups;

	/*let groups = _.flatmap(servers, (hub) => {
		let filteredSets = filterDatasets(datasets, hub);
		return sortGroups(metaGroups(groupDatasets(filteredSets, hub)));
	});

	return groups;*/

	//let groups = _.flatmap(servers, (hub) => {
	//	let filteredSets = filterDatasets(datasets, hub);
	//	let groupedSets = groupDatasets(filteredSets, hub);
	//	return _.mapObject(groupedSets, (group, gName) => shrinkDatasets(group));
	//});
	//return groups;
}

function getStyleSuffix(isMatch) {
	return isMatch ? 'info' : 'default'
}

function makeGroup(groupMeta, activeGroupName, onSelect, setValue) {
	let {name, options} = groupMeta,
		groupIsException = _.contains(exceptions, name),
		header =
			<div className='row'>
				<span className='col-md-11'>
					<b>{name}</b>
				</span>
				<span className='col-md-1'>
					<Glyphicon glyph={activeGroupName === name ? 'menu-up' : 'triangle-bottom'} />
				</span>
			</div>;
	return groupIsException ? (
		<div key={name} className={`panel panel-${getStyleSuffix(options[0].value === setValue)}`}>
			<div className='panel-heading' onClick={() => onSelect(options[0].value)}>
				<h3 className="panel-title"><strong>{name}</strong></h3>
			</div>
		</div>)
		:
		(<Panel collapsible key={name} eventKey={name} header={header}>
			<ListGroup fill>
				{options.map((opt, i) =>
					<ListGroupItem key={i} onClick={() => onSelect(opt.value)} eventKey={opt.value}
						href='#' bsStyle={getStyleSuffix(opt.value === setValue)}>{opt.label}
					</ListGroupItem>
				)}
			</ListGroup>
		</Panel>
	);
}

var DatasetSelect = React.createClass({
	name: 'Dataset',
	getInitialState: function() {
		let {datasets, servers} = this.props;
		return {
			activeGroup: '',
			groups: groupsFromDatasets(datasets, servers)
		}
	},
	componentWillReceiveProps: function(newProps) {
		if (!_.isEqual(this.props.groups !== newProps.groups)) {
			let {datasets, servers} = this.props;
			this.setState({groups: groupsFromDatasets(datasets, servers)});
		}
	},
	onSetGroup: function(newGroupName) {
		// Set 'activeGroup' to empty string as a way to toggle the group to be on/off
		let groupName = (newGroupName !== this.state.activeGroup) ? newGroupName : '';
		this.setState({activeGroup: groupName});
	},
	mixins: [deepPureRenderMixin],
	render: function () {
		var {disable, datasets, makeLabel, onSelect, value, ...other} = this.props,
			{activeGroup, groups} = this.state,
			chosenValue = datasets && datasets[value],
			label = makeLabel(chosenValue && chosenValue.label,
				chosenValue ? 'Chosen dataset:' : `Choose a ${this.name}`),
			content = disable ? null :
				<Accordion className='form-group' onSelect={this.onSetGroup}>
					{_.map(groups, (groupMeta) =>
						makeGroup(groupMeta, activeGroup, onSelect, value))
					}
				</Accordion>;
		return (
			<div>
				{label}
				{disable ? <hr /> : null}
				{content}
			</div>
		);
	}
});

module.exports = DatasetSelect;
