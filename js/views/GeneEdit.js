'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var trim = require('underscore.string').trim;
var _ = require('../underscore_ext');
var parsePos = require('../parsePos');

var getFieldType = ({type, dataSubType}) =>
	type === 'genomicSegment' ? 'segmented' :
		((dataSubType.search(/SV|structural/i) !== -1) ? 'SV' : 'mutation');

var apply = _.curry((valueType, features, state, __, meta) => {
	var gene = trim(state.gene),
		pos = parsePos(gene, meta.assembly);
	return {
		fields: pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] : [gene],
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
		var {gene, makeLabel, setEditorState, pos} = this.props,
			label = pos ? 'Gene or position' : 'Gene',
			content =
				(<div>
					<Input type='textinput' value={gene}
						   onChange={ev => setEditorState({gene: ev.target.value})}/>
					<div>e.g. TP53</div>
					{pos ? <div>or chr1:200000-300000</div> : null}
				</div>);
		return (
			<div className="form-group">{makeLabel(content, label)}</div>
		);
	}
});


var getEditor = valueType => ({
	Editor: GeneEdit,
	valid,
	apply: apply(valueType)
});

module.exports = getEditor;
