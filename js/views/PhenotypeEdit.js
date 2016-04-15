/*global require: false, module: false */
'use strict';

var React = require('react');
var Select = require('../views/Select');
var _ = require('../underscore_ext');


function apply(features, state) {
	var {feature} = state,
		fieldTxt = _.find(features, f => f.value === feature).label;
	return {
		fields: [feature],
		dataType: 'clinicalMatrix',
		fieldLabel: {user: fieldTxt, 'default': fieldTxt}
	};
}

var valid = state => !!state.feature;
var stripFields = f => ({dsID: f.dsID, label: (f.longtitle || f.name), value: f.name});
var consolidateFeatures = featureSet => {
	return _.reduce(featureSet, (all, features, dsID) => {
		return _.merge(all, _.mapObject(features, f =>
			stripFields(_.extend(f, {dsID: dsID}))));
	}, {});
};

// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass({
	name: 'View', // XXX change col-md-offset-10, etc. to react-boostrap style
	getInitialState: function() {
		return {
			features: consolidateFeatures(this.props.allFeatures)
		}
	},
	onSelect: function(f) {
		var {callback, metas, setEditorState} = this.props;
		var feature = this.state.features[f];
		callback(['edit-dataset', feature.dsID, metas[feature.dsID]]);
		setEditorState({feature: feature.value});
	},
	render: function () {
		var {feature = {}, makeLabel} = this.props,
			labelValue = _.isEmpty(feature) ? `Choose a ${this.name}:` : `${this.name} chosen:`,
			//XXX Account for 'charLimit' prop after 'NewNavigation' branch is merged into master
			content = <Select value={feature} allowSearch={true}
				onSelect={this.onSelect} options={this.state.features}/>,
			label = makeLabel(content, labelValue);
		return (
			<div className='row'>{label}</div>
		);
	}
});

module.exports = {
	Editor: PhenotypeEdit,
	valid,
	apply
};
