/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var Modal = require('react-bootstrap/lib/Modal');
var Select = require('./Select');
var DatasetSelect = require('./datasetSelect');
var _ = require('./underscore_ext');
var trim = require('underscore.string').trim;
var uuid = require('uuid');
require('./ColumnEdit.css');

// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass({
	apply: function () {
		var {feature} = this.state,
			fieldTxt = _.find(this.props.features, f => f.value === feature).label;
		this.props.update({
			fields: [feature],
			dataType: 'clinicalMatrix',
			fieldLabel: {user: fieldTxt, 'default': fieldTxt}
		});
	},
	// XXX change col-md-offset-10, etc. to react-boostrap style
	render: function () {
		var {feature} = this.state || {};
		var {features} = this.props;
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>View:</label>
					<Select value={feature}
						callback={([, f]) => this.setState({feature: f})}
						options={features} />
				</div>
				<div className='form-group'>
					<Button disabled={!feature} onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
			</div>
		);
	}
});

// Select a gene.
var GeneEdit = React.createClass({
	apply: function () {
		var gene = trim(this.state.gene);
		this.props.update({
			fields: [gene],
			dataType: 'mutationVector',
			fieldLabel: {user: gene, 'default': gene},
			sFeature: 'impact'
		});
	},
	render: function () {
		var {gene} = this.state || {};
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Gene:</label>
					<div className='col-md-4'>
						<Input value={gene}
							onChange={ev => this.setState({gene: ev.target.value})}
							type='text'/>
					</div>
				</div>
				<div className='form-group'>
					<p className='col-md-offset-2'>e.g. TP53</p>
				</div>
				<div className='form-group'>
					<Button disabled={!trim(gene)} onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
			</div>
		);
	}
});

function toGeneList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,/), s => trim(s), _.identity));
}

// Select a list of genes, or list of identifiers. genes/identifier mode
// is selectable if the dataset supports gene views.
var GeneProbeEdit = React.createClass({
	getInitialState () {
		// Default to genes, unless we have no genes display.
		return {
			genes: this.props.genes
		};
	},

	componentWillReceiveProps (nextProps) {
		// Reset 'genes' state if we no longer have a genes display.
		this.setState({genes: nextProps.genes ? this.state.genes : false});
	},

	apply: function () {
		var {list, genes} = this.state,
			fields = toGeneList(list),
			fieldTxt = fields.join(', ');
		this.props.update({
			fields: fields,
			dataType: genes ? (fields.length > 1 ? 'geneMatrix' : 'geneProbesMatrix') :
				'probeMatrix',
			fieldLabel: {user: fieldTxt, 'default': fieldTxt}
		});
	},

	// this.state
	//     genes: boolean User has selected 'genes' display.
	//     examples: list<string> Identifier examples from server.
	//     list: string List of genes/identifiers entered by user.
	// this.props
	//     genes: boolean Whether the dataset has a gene mapping.
	//
	render: function () {
		var {genes, list} = this.state || {};
		var {examples} = this.props;
		var help = genes ? 'e.g. TP53 or TP53, PTEN' :
			// babel-eslint/issues/31
			examples ? `e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}` : ''; //eslint-disable-line comma-spacing
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Input:</label>
					{this.props.genes ?
						<div className='col-md-4'>
							<Input onChange={() => this.setState({genes: true})}
								 checked={genes}
								 type='radio' name='mode' value='genes' label='genes'/>
							<Input onChange={() => this.setState({genes: false})}
								checked={!genes}
								type='radio' name='mode' value='identifiers' label='identifiers'/>
						</div> :
					null}
				</div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>{genes ? 'Genes:' : 'Identifiers:'}</label>
					<div className='col-md-9'>
						<Input onChange={ev => this.setState({list: ev.target.value})}
							type='textarea' value={list} />
					</div>
				</div>
				<div className='form-group'>
					<p className='col-md-offset-2'>{help}</p>
				</div>
				<div className='form-group'>
					<Button disabled={!(list && toGeneList(list).length)}
							onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div> :
			</div>
	   );
	}
});

function pickEditor(meta, update, columnEdit) {
	if (meta.type === 'clinicalMatrix') {
		return <PhenotypeEdit update={update} features={_.getIn(columnEdit, ['features'])}/>;
	}

	if (meta.type === 'mutationVector') {
		return <GeneEdit update={update}/>;
	}

	return <GeneProbeEdit genes={!!meta.probeMap} update={update} examples={_.getIn(columnEdit, ['examples'])}/>;
}

var ColumnEdit = React.createClass({
	getInitialState: () => ({}),
	addColumn: function (settings) {
		let {callback, appState: {datasets: {datasets}}} = this.props,
			label = datasets[this.state.dataset].label;
			settings = _.assoc(settings,
				'width', 200, // XXX move this default setting?
				'columnLabel', {user: label, 'default': label},
				'dsID', this.state.dataset);
		this.props.onRequestHide();
		callback(['add-column', uuid(), settings]);
	},
	selectDataset: function ([, dsID]) {
		var {callback, appState: {datasets}} = this.props,
			meta = _.getIn(datasets, ['datasets', dsID]);

		this.setState({dataset: dsID});
		callback(['edit-dataset', dsID, meta]);
	},
	render: function () {
		var {dataset} = this.state,
			{appState: {datasets, columnEdit}} = this.props,
			meta = dataset && _.getIn(datasets, ['datasets', dataset]);
		var editor = meta ? pickEditor(meta, this.addColumn, columnEdit) : '';

		return (
			<Modal {...this.props} show={true} className='columnEdit container'>
				<Modal.Header closeButton>
					<Modal.Title>Column Fields</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<form className='form-horizontal'>
						<div className='form-group'>
							<label className='col-md-2 control-label'>Dataset</label>
							<div className='col-md-10'>
								<DatasetSelect
									value={dataset}
									event='edit-dataset'
									callback={this.selectDataset}
									datasets={datasets} />
							</div>
						</div>
						{editor}
					</form>
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;
