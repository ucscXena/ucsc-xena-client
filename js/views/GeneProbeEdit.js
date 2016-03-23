/*global require: false, module: false */
'use strict';

var React = require('react');
var {Input, Panel, Well} = require('react-bootstrap/lib');
var _ = require('../underscore_ext');
var trim = require('underscore.string').trim;

function apply(features, state) {
	var {list, genes} = state,
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
		var {genes, hasGenes, list, examples, setEditorState} = this.props,
			doGenes = hasGenes && genes;
		var help = doGenes ? 'e.g. TP53 or TP53, PTEN' :
			// babel-eslint/issues/31
			examples ? `e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}` : ''; //eslint-disable-line comma-spacing
		return (
			<div>
				{hasGenes ?
				<Well bsSize="small">
					<div className='row'>
						<div className='col-md-4 text-right'>
							<h4>Choose an Input: </h4>
						</div>
						<div className='col-md-2'>
							<Input onChange={() => setEditorState({genes: true})}
								checked={genes}
								type='radio' name='mode' value='genes' label='genes'/>
						</div>
						<div className='col-md-2'>
							<Input onChange={() => setEditorState({genes: false})}
								checked={!genes}
								type='radio' name='mode' value='identifiers' label='identifiers'/>
						</div>
					</div>
				</Well>: null}
				<Panel className='form-group' header={<b>{doGenes ? 'Genes' : 'Identifiers'}</b>}>
					<Input onChange={ev => setEditorState({list: ev.target.value})}
						type='textarea' bsSize='large' value={list} />
					<p><small>{help}</small></p>
				</Panel>
			</div>
	   );
	}
});


module.exports = {
	Editor: GeneProbeEdit,
	valid,
	apply
};
