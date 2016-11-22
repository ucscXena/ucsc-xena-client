/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var trim = require('underscore.string').trim;
var _ = require('../underscore_ext');

var getFieldType = ({type, dataSubType}) =>
	type === 'genomicSegment' ? 'segmented' :
		((dataSubType.search(/SV|structural/i) !== -1) ? 'SV' : 'mutation');

var apply = _.curry((valueType, features, state, __, meta) => {
	var gene = trim(state.gene);
	return {
		fields: [gene],
		fetchType: 'xena',
		valueType,
		fieldType: getFieldType(meta),
		fieldLabel: gene,
		dsID: meta.dsID,
		assembly: meta.assembly,
		sFeature: 'impact'
	};
});

var valid = state => trim(state.gene);

// Select a gene.
var GeneEdit = React.createClass({
	name: 'Gene',
	render: function () {
		var {gene, makeLabel, setEditorState} = this.props,
			content =
				(<div>
					<Input type='textinput' value={gene}
						   onChange={ev => setEditorState({gene: ev.target.value})}/>
					<div>e.g. TP53</div>
				</div>);
		return (
			<div className="form-group">{makeLabel(content, `Gene`)}</div>
		);
	}
});


var getEditor = valueType => ({
	Editor: GeneEdit,
	valid,
	apply: apply(valueType)
});

module.exports = getEditor;
