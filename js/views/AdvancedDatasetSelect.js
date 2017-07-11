'use strict';
var React = require('react');
var _ = require('../underscore_ext');

const LOCAL_DOMAIN = 'https://local.xena.ucsc.edu:7223';
const LOCAL_DOMAIN_LABEL  = 'My Computer Hub' ;

const ignoredType = ['probeMap', 'genePredExt', 'probemap', 'sampleMap']; // Important for unassigned cohort
const ignoredSubtype = ['Filter', 'filter', 'phenotype', 'phenotypes', 'Phenotype', 'Phenotypes']; // XXX Looks brittle. use regex?

var notIgnored = ({type, dataSubType}) => !_.contains(ignoredType, type) && !_.contains(ignoredSubtype, dataSubType);

var category = ({dsID, dataSubType}) =>
	dsID.includes(LOCAL_DOMAIN) ?  LOCAL_DOMAIN_LABEL : (dataSubType ? dataSubType : 'others');

function createLabels(datasets) {
	var sorted = _.sortBy(datasets, ds => ds.label.toLowerCase()),
		labels = _.uniquify(_.pluck(sorted, 'label'));
	return _.mmap(sorted, labels, ({dsID}, label) => ({dsID, label}));
}

// Create dataset list. Sorts by category and label, and enforces unique labels by
// appending a suffix.
function datasetList(datasets) {
	var groups = _.fmap(_.groupBy(datasets.filter(notIgnored), category), createLabels);

	return _.sortBy(_.keys(groups), g => g.toLowerCase()).map(group => (
		<div>
			<label>{group}</label>
			<ul>{groups[group].map(({dsID, label}) => (<li data-dsid={dsID}>{label}</li>))}</ul>
	   </div>));
}

// Group by local hub, dataSubType, or other.
// Add numbers to labels for duplicate labels.
var AdvancedDatasetSelect = React.createClass({
	onClick(ev) {
		var dsID = ev.target.dataset.dsid;
		console.log(dsID);
		if (dsID) {
			this.props.onSelect(dsID);
		}
	},
	render() {
		var {datasets} = this.props;
		return <div onClick={this.onClick}>{datasetList(_.values(datasets))}</div>;
	}
});

module.exports = AdvancedDatasetSelect;
