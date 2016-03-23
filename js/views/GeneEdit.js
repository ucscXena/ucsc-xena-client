/*global require: false, module: false */
'use strict';

var React = require('react');
var {Input} = require('react-bootstrap/lib/');
var trim = require('underscore.string').trim;

function apply(features, state) {
	var gene = trim(state.gene);
	return {
		fields: [gene],
		dataType: 'mutationVector',
		fieldLabel: {user: gene, 'default': gene},
		sFeature: 'impact'
	};
}

var valid = state => !!trim(state.gene);

// Select a gene.
var GeneEdit = React.createClass({
	name: 'Gene',
	render: function () {
		var {gene, makeLabel, setEditorState} = this.props;
		//let header = gene ? makeHeader(`Entered ${this.name}: ${gene}`, true)
		//	: makeHeader(`Input a ${this.name}`, false);
		let content =
			<div className="form-group">
				<Input type='text' value={gene} bsSize="large"
					   onChange={ev => setEditorState({list: ev.target.value})}/>
				<small>e.g. TP53</small>
			</div>;
		let label = makeLabel(content, `Enter a ${this.name}`);
		return (
			<div className="row">{label}</div>
		);
	}
});

module.exports = {
	Editor: GeneEdit,
	valid,
	apply
};
