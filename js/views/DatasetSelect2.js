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
//var sortDatasets = list => _.sortBy(list, ds => ds.label.toLowerCase());
var sortDatasets = (groups) => groups.map(dsGroup => {
	let sortedOptions = _.sortBy(dsGroup.options, ds => ds.label.toLowerCase());
	return _.assoc(dsGroup, 'options', sortedOptions);
});
var sortKeys = keys => _.sortBy(keys, key => key.toLowerCase());
var stripDatasets = list => _.map(list, ds => ({label: ds.label, value: ds.dsID}));
var addIterations = groups =>
	_.map(groups, group =>
		_.extend(group, {iterations: _.countBy(group.options, ds => ds.label)}));
var getStyleSuffix = isMatch => isMatch ? 'info' : 'default';

function groupsFromDatasets(datasets, servers) {
	return _.reduce(servers, (allGroups, hub) => {
		let filteredSets = filterDatasets(datasets, hub),
			groupedSets = groupDatasets(filteredSets, hub),
			sortedGroupNames = sortKeys(_.keys(groupedSets));
		sortedGroupNames.forEach(groupName => {
			let dsIndex = _.findKey(allGroups, dsGroup => dsGroup.name === groupName),
				groupMeta = {
					name: groupName,
					options: stripDatasets(groupedSets[groupName])
				};
			allGroups = !dsIndex ? allGroups.concat([groupMeta]) :
					_.updateIn(allGroups, [dsIndex, 'options'], prevOptions =>
						prevOptions.concat(groupMeta.options));
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
			<Panel collapsible key={name} eventKey={name} header={header} panelRole={name}>
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
			groups: addIterations(sortDatasets(groupsFromDatasets(datasets, servers)))
		};
	},
	componentWillReceiveProps: function(newProps) {
		var keys = ['datasets', 'servers'],
			updated = _.pick(newProps, keys),
			previous = _.pick(this.props, keys);

		if (!_.isEqual(updated, previous)) {
			let {datasets, servers} = updated;
			this.setState({
				groups: addIterations(sortDatasets(groupsFromDatasets(datasets, servers)))
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
		var {disable, datasets, makeLabel, onSelect, value} = this.props,
			{activeGroup, groups} = this.state,
			chosenValue = datasets && datasets[value],
			label = makeLabel(chosenValue && chosenValue.label,
				chosenValue ? 'Chosen dataset:' : `Choose a ${this.name}`),
			content = disable ? null :
				<Accordion activeKey={activeGroup} className='form-group' onSelect={this.onSetGroup}>
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
