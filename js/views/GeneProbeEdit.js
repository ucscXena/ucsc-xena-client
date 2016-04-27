/*global require: false, module: false */
'use strict';

var React = require('react');
var {ButtonGroup, Button, Input} = require('react-bootstrap/lib');
var _ = require('../underscore_ext');
var trim = require('underscore.string').trim;

function apply(features, state, hasGenes, dataset) {
	var {list, genes} = state,
		fields = toGeneList(list),
		fieldTxt = fields.join(', ');

	if (hasGenes && genes === undefined){
		genes = true;
	}

	return {
		fields: fields,
		fetchType: 'xena',
		valueType: 'float',
		defaultNormalization: _.get(dataset, 'colnormalization'),
		fieldType: genes ? (fields.length > 1 ? 'genes' : 'geneProbes') : 'probes',
		fieldLabel: fieldTxt
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
			doGenes = hasGenes && genes,
			help = doGenes ? 'e.g. TP53 or TP53, PTEN' :
				`e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}`,
			content,
			optionEl;

		if (hasGenes) {
			content =
				(<ButtonGroup justified>
					<Button href='#' active={!!genes}
						onClick={() => setEditorState({genes: true})}>
						<strong className="control-label">Genes</strong>
					</Button>
					<Button href='#' active={!genes}
						onClick={() => setEditorState({genes: false})}>
						<strong className="control-label">Identifiers</strong>
					</Button>
				</ButtonGroup>);
			optionEl = makeLabel(content, 'Input');
		}

		content =
			(<div>
				<Input onChange={ev => setEditorState({list: ev.target.value})}
					type='textarea' value={list} />
				<div>{help}</div>
			</div>);
		var inputEl = makeLabel(content, doGenes ? 'Genes' : 'Identifiers');

		return (
			<div className="form-group">
				{optionEl}
				{optionEl ? <br/> : null}
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
