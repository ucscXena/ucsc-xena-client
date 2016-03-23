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
//var filterDatasets = list => list.filter(ds => notIgnored(ds) && loaded(ds));
var sortByGroupName = list => _.sortBy(list, (group, name) => name.toLowerCase());

function groupsFromDatasets(datasets, localHubUrl) {
	let dsGroups = {local: {}, remote: {}},
		localGroupKey = 'Your computer hub';
	_.each(datasets, (ds, key) => {
		let server = 'remote';
		if (loaded(ds)) {
			let group = '';
			if (JSON.parse(key).host === localHubUrl) {
				group = localGroupKey;
				server = 'local';
			} else {
				group = exceptions[ds.type] || ds.dataSubType;
				if (ds.type.includes('pheno'))
					console.log(ds.type);
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
	return (localGroup ? [localGroup] : []).concat(sortByGroupName(dsGroups.remote));
}

function getStyleSuffix(isMatch) {
	return isMatch ? 'info' : 'default'
}

function makeGroup(group, activeGroupName, onSelect, setValue) {
	let {name, options} = group,
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
			<div className='panel-heading' onClick={() => onSelect(options[0].value)}>{name}</div>
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
		let {datasets, localHubUrl} = this.props;
		return {
			activeGroup: '',
			groups: groupsFromDatasets(datasets, localHubUrl)
		}
	},
	componentWillReceiveProps: function(newProps) {
		if (!_.isEqual(this.props.groups !== newProps.groups)) {
			let {datasets, localHubUrl} = this.props;
			this.setState({groups: groupsFromDatasets(datasets, localHubUrl)});
		}
	},
	//onSelect: function(dsID, groupName) {
	//	this.props.onSelect(dsID);
	//	//this.onSetGroup(groupName);
	//},
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
					{_.map(groups, group => makeGroup(group, activeGroup, onSelect, value))}
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
