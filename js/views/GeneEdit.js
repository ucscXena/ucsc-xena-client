/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var trim = require('underscore.string').trim;

function apply(features, state, meta) {
	var gene = trim(state.gene);
	return {
		fields: [gene],
		fetchType: 'xena',
		valueType: 'mutation',
		fieldType: 'mutation',
		fieldLabel: gene,
		assembly: meta.assembly,
		sFeature: 'impact'
	};
}

var valid = state => trim(state.gene);

// Select a gene.
var GeneEdit = React.createClass({
	render: function () {
		var {gene, setEditorState} = this.props;
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Gene:</label>
					<div className='col-md-4'>
						<Input value={gene}
							onChange={ev => setEditorState({gene: ev.target.value})}
							type='text'/>
					</div>
				</div>
				<div className='form-group'>
					<p className='col-md-offset-2'>e.g. TP53</p>
				</div>
			</div>
		);
	}
});

module.exports = {
	Editor: GeneEdit,
	valid,
	apply
};
