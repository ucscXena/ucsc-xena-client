/*global require: false, module: false */
'use strict';

var React = require('react');
var Select = require('../views/Select');

function apply(features, state) {
	var {feature} = state,
		meta = features[feature];
	return {
		fields: [feature],
		fetchType: 'xena',
		valueType: meta.valuetype === 'float' ? 'float' : 'coded',
		fieldType: 'clinical',
		fieldLabel: meta.longtitle || feature
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
