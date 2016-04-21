/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
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
		var {gene, makeLabel, setEditorState} = this.props,
			content =
				<div>
					<Input type='textinput' value={gene}
						   onChange={ev => setEditorState({gene: ev.target.value})}/>
					<div>e.g. TP53</div>
				</div>;
		return (
			<div className="form-group">{makeLabel(content, `Gene`)}</div>
		);
	}
});

module.exports = {
	Editor: GeneEdit,
	valid,
	apply
};
