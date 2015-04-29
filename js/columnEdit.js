/*global require: false, module: false */
'use strict';

var React = require('react');
var Input = require('react-bootstrap/lib/Input');
var Button = require('react-bootstrap/lib/Button');
var Modal = require('react-bootstrap/lib/Modal');
var Select = require('./Select');
var DatasetSelect = require('./datasetSelect');
var xenaQuery = require('./xenaQuery');
var L = require('./lenses/lens');
var _ = require('./underscore_ext');
var propsStream = require('./react-utils').propsStream;
var trim = require('underscore.string').trim;
var uuid = require('uuid');
var util = require('./util');
require('./ColumnEdit.css');

function sortFeatures(features) {
	return _.map(features, (label, name) => ({value: name, label: label}))
		.sort((a, b) => util.caseInsensitiveSort(a.label, b.label));
}

function fetchFeatures(stream) {
	return stream.distinctUntilChanged()
		.map(props => xenaQuery.dsID_fn(xenaQuery.feature_list)(props.dataset))
		.switchLatest()
		.map(sortFeatures);
}

// Select a phenotype feature from those on the server.
var PhenotypeEdit = React.createClass(propsStream({
	componentWillMount: function () {
		fetchFeatures(this.propsStream).subscribe(
			features => this.setState({features: features}));
	},
	apply: function () {
		var {feature} = this.state,
			fieldTxt = _.find(this.state.features, f => f.value === feature).label;
		this.props.update({
			fields: [feature],
			dataType: 'clinicalMatrix',
			fieldLabel: {user: fieldTxt, 'default': fieldTxt}
		});
	},
	// XXX change col-md-offset-10, etc. to react-boostrap style
	render: function () {
		var {features, feature} = this.state || {};
		var selectLens = L.lens(() => feature, (x, v) => this.setState({feature: v}));
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>View:</label>
					<Select lens={selectLens} options={features} />
				</div>
				<div className='form-group'>
					<Button disabled={!feature} onClick={this.apply} className='col-md-offset-10'>Apply</Button>
				</div>
			</div>
		);
	}
}));

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

function fetchExamples(stream) {
	return stream.distinctUntilChanged()
		.map(props => xenaQuery.dsID_fn(xenaQuery.dataset_field_examples)(props.dataset))
		.switchLatest()
		.map(list => _.pluck(list, 'name'));
}

function toGeneList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,/), s => trim(s), _.identity));
}

// Select a list of genes, or list of identifiers. genes/identifier mode
// is selectable if the dataset supports gene views.
var GeneProbeEdit = React.createClass(propsStream({
	componentWillMount: function () {
		fetchExamples(this.propsStream).subscribe(
			examples => this.setState({examples: examples}));
	},

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
		var {genes, list, examples} = this.state || {};
		var help = genes ? 'e.g. TP53 or TP53, PTEN' :
			examples ? `e.g. ${examples[0]} or ${examples[0]}, ${examples[1]}` : '';
		return (
			<div>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Input:</label>,
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
}));

function pickEditor(meta, lens, update) {
	if (meta.type === 'clinicalMatrix') {
		return <PhenotypeEdit lens={lens} update={update}/>;
	}

	if (meta.type === 'mutationVector') {
		return <GeneEdit update={update}/>;
	}

	return <GeneProbeEdit genes={!!meta.probeMap} lens={lens} update={update}/>;
}

function addColumn (settings, label, state) {
	var {columnRendering, columnOrder} = state;
	var id = 'c-' + uuid();

	settings = _.assoc(settings, "width", 200); // add default

	return _.assoc(state,
				  'columnRendering', _.assoc(columnRendering, id, settings),
				  'columnOrder', _.conj(columnOrder, id)); // change this if editing in-place
}

var ColumnEdit = React.createClass({
	getInitialState: () => ({}),
	addColumn: function (settings) {
		var label = this.props.datasets.datasets[this.state.dataset].label;
		settings = _.assoc(settings,
			'columnLabel', {user: label, 'default': label},
			'dsID', this.state.dataset);
		this.props.onRequestHide();
		L.over(this.props.lens, s => addColumn(settings, label, s));
	},
	render: function () {
		var {dataset} = this.state,
			{datasets} = this.props,
			meta = dataset && _.getIn(datasets, ['datasets', dataset]);
		var selectLens = L.lens(() => ({dataset: dataset}), (x, v) => this.setState(v));
		var editor = meta ? pickEditor(meta, selectLens, this.addColumn) : '';

		return (
			<Modal {...this.props} className='columnEdit container' title="Column Fields">
				<form className='form-horizontal'>
					<div className='form-group'>
						<label className='col-md-2 control-label'>Dataset</label>
						<div className='col-md-10'>
							<DatasetSelect lens={selectLens} datasets={this.props.datasets} />
						</div>
					</div>
					{editor}
				</form>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;
