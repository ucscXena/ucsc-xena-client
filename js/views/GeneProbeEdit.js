/*global require: false, module: false */
'use strict';

var React = require('react');
var {ButtonGroup, Button, Input} = require('react-bootstrap/lib');
var _ = require('../underscore_ext');
var trim = require('underscore.string').trim;

function apply(features, state) {
	var {list, genes=true} = state,
		fields = toGeneList(list),
		fieldTxt = fields.join(', ');

	return {
		fields: fields,
		dataType: genes ? (fields.length > 1 ? 'geneMatrix' : 'geneProbesMatrix') :
			'probeMatrix',
		fieldLabel: {user: fieldTxt, 'default': fieldTxt}
	};
}

var valid = ({list}) => list && !!toGeneList(list).length;

function toGeneList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,| |\n|\t/), s => trim(s), _.identity));
}

// Select a list of genes, or list of identifiers. genes/identifier mode
// is selectable if the dataset supports gene views.
var GeneProbeEdit = React.createClass({
	// this.props
	//     hasGenes: boolean Whether the dataset has a gene mapping.
	//     genes: boolean User has selected 'genes' display.
	//     examples: list<string> Identifier examples from server.
	//     list: string List of genes/identifiers entered by user.
	//
	render: function () {
		var {genes = true, hasGenes, list, examples, makeLabel, setEditorState} = this.props,
			doGenes = hasGenes && genes;
		var help = doGenes ? 'e.g. TP53 or TP53, PTEN' :
			examples ? `e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}` : '';
		var optionEl = null;

		if (hasGenes) {
			let content =
				<ButtonGroup justified>
					<Button href='#' active={!!genes}
						onClick={() => setEditorState({genes: true})}>
						<strong className="control-label">Genes</strong>
					</Button>
					<Button href='#' active={!genes}
						onClick={() => setEditorState({genes: false})}>
						<strong className="control-label">Identifiers</strong>
					</Button>
				</ButtonGroup>;
			optionEl = makeLabel(content, 'Input:');
		}

		var content =
			<div>
				<Input onChange={ev => setEditorState({list: ev.target.value})}
					type='textarea' bsSize='large' value={list} />
				<div className="text-muted">{help}</div>
			</div>;
		var inputEl = makeLabel(content, doGenes ? 'Genes:' : 'Identifiers:');

		return (
			<div className="form-group">
				{optionEl}
				<br/>
				{inputEl}
			</div>
	   );
	}
});


module.exports = {
	Editor: GeneProbeEdit,
	valid,
	apply
};
