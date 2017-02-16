'use strict';

var React = require('react');
var Button = require('react-bootstrap/lib/Button');
var Modal = require('react-bootstrap/lib/Modal');
var DatasetSelect = require('./views/DatasetSelect');
var _ = require('./underscore_ext');
var uuid = require('./uuid');
require('./ColumnEdit.css');
var phenotypeEdit = require('./views/PhenotypeEdit');
var geneEdit = require('./views/GeneEdit');
var geneProbeEdit = require('./views/GeneProbeEdit');
var {defaultColorClass} = require('./heatmapColors');

var editors = {
	'clinicalMatrix': phenotypeEdit,
	'mutationVector': geneEdit,
	'none': {Editor: () => <span></span>, valid: () => false}
};

var pickEditor = m => _.get(editors, _.get(m, 'type', 'none'), geneProbeEdit);

var ColumnEdit = React.createClass({
	getInitialState: () => ({}),
	addColumn: function (settings) {
		let {callback, appState: {datasets}} = this.props,
			label = datasets[this.state.dataset].label,
			colorClass = defaultColorClass(datasets[this.state.dataset]),
			assembly = datasets[this.state.dataset].assembly;
		settings = _.assoc(settings,
			'width', 200, // XXX move this default setting?
			'columnLabel', {user: label, 'default': label},
			'assembly', assembly,
			'colorClass', colorClass,
			'dsID', this.state.dataset);
		this.props.onHide();
		callback(['add-column', uuid(), settings]);
	},
	onSelect: function (dsID) {
		var {callback, appState: {datasets}} = this.props,
			meta = _.get(datasets, dsID),
			hasGenes = _.get(meta, 'probeMap');

		this.setState({dataset: dsID, editor: {hasGenes, genes: hasGenes}});
		callback(['edit-dataset', dsID, meta]);
	},
	setEditorState: function (state) {
		var {editor} = this.state;
		this.setState({editor: _.merge(editor, state)});
	},
	render: function () {
		var {dataset, hasGenes, editor} = this.state,
			{appState: {datasets, columnEdit}} = this.props,
			features = _.getIn(columnEdit, ['features']),
			meta = dataset && _.get(datasets, dataset);
		var {Editor, valid, apply} = pickEditor(meta);

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
									onSelect={this.onSelect}
									datasets={datasets} />
							</div>
						</div>
						<Editor {...columnEdit} {...editor} setEditorState={this.setEditorState}/>
						<div className='form-group'>
							<Button disabled={!valid(editor)}
									onClick={() => this.addColumn(apply(features, editor, hasGenes, dataset))} className='col-md-offset-10'>Apply</Button>
						</div>
					</form>
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;
