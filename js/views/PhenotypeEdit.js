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


// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass({
	name: 'View',
	// XXX change col-md-offset-10, etc. to react-boostrap style
	render: function () {
		var {feature = {}, features, makeLabel, setEditorState} = this.props,
			labelValue = _.isEmpty(feature) ? `Choose a ${this.name}:` : `${this.name} chosen:`,
			content = <Select onSelect={f => setEditorState({feature: f})}
							  allowSearch={true} value={feature} options={features}/>,
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
