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
	// XXX change col-md-offset-10, etc. to react-boostrap style
	render: function () {
		var {feature = {}, features, setEditorState} = this.props;
		return (
			<div className='form-group'>
				<label className='col-md-2 control-label'>View:</label>
				<Select value={feature}
					onSelect={f => setEditorState({feature: f})}
					options={features} />
			</div>
		);
	}
});

module.exports = {
	Editor: PhenotypeEdit,
	valid,
	apply
};
