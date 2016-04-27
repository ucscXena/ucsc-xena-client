/*global require: false, module: false */
'use strict';

var React = require('react');
var Select = require('../views/Select');
var _ = require('../underscore_ext');

function apply(features, state) {
	var {feature, dsID} = state,
		meta = features[feature];
	return {
		fields: [feature],
		fetchType: 'xena',
		valueType: meta.valuetype === 'float' ? 'float' : 'coded',
		fieldType: 'clinical',
		dsID: dsID,
		fieldLabel: meta.longtitle
	};
}

var valid = state => !!state.feature;
var stripFields = f => ({dsID: f.dsID, label: (f.longtitle || f.name), value: f.name});
var consolidateFeatures = featureSet => {
	return _.reduce(featureSet, (all, features, dsID) => {
		let strippedFeatures = _.toArray(_.mapObject(features, f =>
			_.extend(stripFields(f), {dsID: dsID})));
		return all.concat(strippedFeatures);
	}, []);
};

var sortFeatures = features => _.sortBy(features, f => f.label.toUpperCase());
var PhenotypeEdit = React.createClass({
	getInitialState: function() {
		var {allFeatures, chosenDs} = this.props,
			filteredFeatures = _.pick(allFeatures,
				function(object, dsID) {
  					return ( chosenDs.indexOf(dsID) !== -1);
				});
		return {
			features: sortFeatures(consolidateFeatures(filteredFeatures))
		};
	},
	onSelect: function(f) {
		var {callback, setEditorState} = this.props,
			{features} = this.state,
			feature = _.findWhere(features, {value: f});

		callback(['edit-dataset', feature.dsID, {type:"clinicalMatrix"}]);
		setEditorState({feature: feature.value, dsID: feature.dsID});
	},
	render: function () {
		var {feature = {}, makeLabel} = this.props,
			{features} = this.state,
			labelValue = "View:",
			content = (<Select value={feature} allowSearch={true}
					   onSelect={this.onSelect} options={features}/>),
			label = makeLabel(content, labelValue);
		return (
			<div className='form-group'>
				{label}
			</div>
		);
	}
});

module.exports = {
	Editor: PhenotypeEdit,
	valid,
	apply
};
