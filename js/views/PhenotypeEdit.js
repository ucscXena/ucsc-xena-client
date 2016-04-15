/*global require: false, module: false */
'use strict';

var React = require('react');
var Select = require('../views/Select');
var _ = require('../underscore_ext');


function apply(features, state) {
	var {feature, dsID} = state,
		fieldTxt = _.find(features, f => f.value === feature).label;
	return {
		fields: [feature],
		dataType: 'clinicalMatrix',
		dsID: dsID,
		fieldLabel: {user: fieldTxt, 'default': fieldTxt}
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
var sortFeatures = features => _.sortBy(features, f => f.label.toLowerCase());

// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass({
	name: 'View', // XXX change col-md-offset-10, etc. to react-boostrap style
	getInitialState: function() {
		return {
			features: sortFeatures(consolidateFeatures(this.props.allFeatures))
		}
	},
	onSelect: function(f) {
		var {callback, metas, setEditorState} = this.props;
		var feature = _.findWhere(this.state.features, {value: f});
		callback(['edit-dataset', feature.dsID, metas[feature.dsID]]);
		setEditorState({feature: feature.value, dsID: feature.dsID});
	},
	render: function () {
		var {feature = {}, makeLabel} = this.props,
			consolidatedFeatures = this.state.features,
			labelValue = _.isEmpty(feature) ? `Choose a ${this.name} :` :
				`${this.name} chosen: `,
			//XXX Account for 'charLimit' prop after 'NewNavigation' branch is merged into master
			content = <Select value={feature} allowSearch={true}
				onSelect={this.onSelect} options={consolidatedFeatures}/>,
			label = makeLabel(content, labelValue);
		return (
			<div className='row'>
				<div className="col-md-12">Total Features: {_.toArray(consolidatedFeatures).length}</div>
				<div className="col-md-12">Features for Specific Phenotype: {_.toArray(this.props.features).length}</div>
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
