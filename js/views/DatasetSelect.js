/*global require: false, module: false */
'use strict';
var React = require('react');
var {Accordion, Glyphicon, ListGroup, ListGroupItem, Panel} = require('react-bootstrap/lib');
var Select = require('./Select');
var _ = require('../underscore_ext');
var xenaQuery = require('../xenaQuery');
var {deepPureRenderMixin} = require('../react-utils');

// group header for a server
const LOCAL_DOMAIN = 'local.xena.ucsc.edu';
//var header = s => xenaQuery.server_url(s);
const aliases = { phenotype: 'Phenotypes' };
var isLoaded = ds => ds.status === 'loaded';
var filterDatasets = (list, server) =>
	_.filter(list, (ds, dsID) =>
		isLoaded(ds) && server.includes(JSON.parse(dsID).host));
var groupDatasets = (list, server) => _.groupBy(list, ds =>
	server.includes(LOCAL_DOMAIN) ? 'My Computer Hub' : ds.dataSubType);
var stripDatasets = list => _.map(list, ds => ({label: ds.label, value: ds.dsID}));
var sortDatasets = list => _.sortBy(list, ds => ds.label.toLowerCase());
var sortKeys = keys => _.sortBy(keys, key => key.toLowerCase());
var addIterations = groups =>
	_.map(groups, group =>
		_.extend(group, {iterations: _.countBy(group.options, ds => ds.label)}));
var getStyleSuffix = isMatch => isMatch ? 'info' : 'default';

function groupsFromDatasets(datasets, servers) {
	return _.reduce(servers, (allGroups, hub) => {
		let filteredSets = filterDatasets(datasets, hub),
			groupedSets = groupDatasets(filteredSets, hub),
			sortedNames = sortKeys(_.keys(groupedSets));

		sortedNames.forEach(groupName => {
			let dsIndex = _.findKey(allGroups, (group) => group.name === groupName),
				groupMeta = {
					name: groupName,
					options: stripDatasets(groupedSets[groupName])
				}

			if (!dsIndex) {
				allGroups = allGroups.concat([groupMeta]);
			} else {
				allGroups = _.updateIn(allGroups, [dsIndex, 'options'], prevOptions => {
					let updatedDatasets = prevOptions.concat(groupMeta.options);
					return sortDatasets(updatedDatasets);
				});
			}
		});
		return allGroups;
	}, []);
}

function makeDs(ds, showPosition, countdown, onSelect, setValue) {
	var {label, value} = ds,
		position = showPosition ? countdown[label] : 0;
	return (
		<ListGroupItem key={label +position} onClick={() => onSelect(value)}
			eventKey={value} href='#' bsStyle={getStyleSuffix(value === setValue)}>
			{label +(position > 0 ? ` (#${position})` : '')}
		</ListGroupItem>
	);
}

function makeGroup(groupMeta, activeGroupName, onSelect, setValue) {
	var {iterations, name, options} = groupMeta,
		groupAlias = aliases[name],
		header =
			<div className='row'>
				<span className='col-md-11'>
					<b>{name}</b>
				</span>
				<span className='col-md-1'>
					<Glyphicon glyph={activeGroupName === name ? 'menu-up' : 'triangle-bottom'}/>
				</span>
			</div>;
	if (groupAlias) {
		return (
			<div key={name} className={`panel panel-${getStyleSuffix(options[0].value === setValue)}`}>
				<div className='panel-heading' onClick={() => onSelect(options[0].value)}>
					<h3 className="panel-title"><strong>{groupAlias}</strong></h3>
				</div>
			</div>
		)
	} else {
		// - Duplicate elements will have a count number appended to their label
		// - All unique elements (e.g. no duplicates) will NOT have count number appended.
		let counts = _.mapObject(iterations, ds => 1);
		let dsElements = options.map(ds => {
			let showPosition = iterations[ds.label] > 1,
				element = makeDs(ds, showPosition, counts, onSelect, setValue);
			++counts[ds.label];
			return element;
		});

		return (
			<Panel collapsible key={name} eventKey={name} header={header}>
				<ListGroup fill>{dsElements}</ListGroup>
			</Panel>
		)
	}
}

var DatasetSelect = React.createClass({
	name: 'Dataset',
	getInitialState: function() {
		var {datasets, servers} = this.props;
		return {
			activeGroup: '',
			groups: addIterations(groupsFromDatasets(datasets, servers))
		}
	},
	componentWillReceiveProps: function(newProps) {
		var keys = ['datasets', 'servers'],
			updated = _.pick(newProps, keys),
			previous = _.pick(this.props, keys);

		if (!_.isEqual(updated, previous)) {
			let {datasets, servers} = this.props;
			this.setState({
				groups: addIterationsToGroups(groupsFromDatasets(datasets, servers))
			});
		}
	},
	onSetGroup: function(newGroupName) {
		// 'activeGroup' is referenced by React Bootrap's Accordion panels as a way
		// to determine whether a group should be expanded.
		var groupName = (newGroupName !== this.state.activeGroup) ? newGroupName : '';
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
