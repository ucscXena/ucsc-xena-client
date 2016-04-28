/*global require: false, module: false */
'use strict';

var React = require('react');
var Button = require('react-bootstrap/lib/Button');
var Modal = require('react-bootstrap/lib/Modal');
var Tab = require('react-bootstrap/lib/Tab');
var Tabs = require('react-bootstrap/lib/Tabs');
var DatasetSelect = require('./views/DatasetSelect');
var _ = require('./underscore_ext');
var uuid = require('./uuid');
require('./ColumnEdit.css');
var phenotypeEdit = require('./views/PhenotypeEdit');
var geneEdit = require('./views/GeneEdit');
var geneProbeEdit = require('./views/GeneProbeEdit');
var {defaultColorClass} = require('./heatmapColors');
var {getColSpec} = require('./models/datasetJoins');
var {mergeDsIDs} = require('./models/fieldSpec');
var util = require('./util');

var editors = {
	'clinicalMatrix': phenotypeEdit,
	'mutationVector': geneEdit,
	'none': {Editor: () => <span></span>, valid: () => false}
};

var getEditor = m => _.get(editors, _.get(m, 'type', 'none'), geneProbeEdit);

function sortFeatures(features) {
	return _.map(features, ({longtitle: label}, name) => ({value: name, label: label || name}))
		.sort((a, b) => util.caseInsensitiveSort(a.label, b.label));
}

var CohortColumnEdit = React.createClass({
	render: function () {
		var {meta, onSelect, dataset, datasets, features, columnEdit, editor, setEditorState} = this.props,
			hasGenes = !!_.get(meta, 'probemap'),
			{Editor} = getEditor(meta),
			featureList = sortFeatures(features[dataset] || []);

		return (
			<form className='form-horizontal'>
				<div className='form-group'>
					<label className='col-md-2 control-label'>Dataset</label>
					<div className='col-md-10'>
						<DatasetSelect
							value={dataset}
							onSelect={onSelect}
							datasets={datasets} />
					</div>
				</div>
				<Editor {...columnEdit} {...editor} features={featureList} setEditorState={setEditorState} hasGenes={hasGenes} />
			</form>
		);
	}
});


var getColumnEdit = _.curry((columnEditList, features, editorList, datasetList, datasets, onSelect, setEditorState, cohort, i) => {
	var columnEdit = _.get(columnEditList, i, {}),
		editor = _.get(editorList, i, {}),
		dataset = _.get(datasetList, i),
		cohortDatasets = _.pick(datasets, ds => ds.cohort === cohort),
		meta = dataset && _.get(datasets, dataset);
	return (
		<Tab key={i} eventKey={i} title={cohort}>
			<CohortColumnEdit {...{meta, features, columnEdit, editor,
				dataset, datasets: cohortDatasets, onSelect, setEditorState}} />
		</Tab>
	);
});

function validColumn(cohort, dataset, datasets, editorState) {
	return cohort.map((c, i) => {
		var dsID = _.get(dataset, i),
			meta = dsID && _.get(datasets, dsID);
		return getEditor(meta).valid(_.get(editorState, i, {}));
	}).filter(_.identity).length > 0;
}

var getFieldSpec = _.curry((featuresList, editorList, datasetList, datasets, i) => {
	var dataset = _.get(datasetList, i),
		meta = dataset && _.get(datasets, dataset),
		features = _.get(featuresList, dataset),
		{apply} = getEditor(meta);

	return dataset ?
		_.assoc(apply(features, _.get(editorList, i), meta),
			'dsID', dataset,
			'colorClass', defaultColorClass(meta),
			'columnLabel', meta.label) : null;
});

var ColumnEdit = React.createClass({
	getInitialState: () => ({tab: 0}),
	addColumn: function (fieldSpecs) {
		let {callback, appState: {datasets/*, columnEdit*/}} = this.props,
			colSpec = getColSpec(mergeDsIDs(this.state.dataset, fieldSpecs), datasets/*, _.get(columnEdit, 'features')*/),
			settings = _.assoc(colSpec,
				'width', 200, // XXX move this default setting?
				'user', _.pick(colSpec, 'columnLabel', 'fieldLabel'));
		this.props.onHide();
		callback(['add-column', uuid(), settings]);
	},
	setEditorState: function (state) {
		var {tab, editor = {}} = this.state,
			next = _.updateIn(editor, [tab], s => _.merge(s, state));
		this.setState({editor: next});
	},
	onSelect: function (dsID) {
		var {callback, appState: {datasets}} = this.props,
			{dataset, editor, tab} = this.state,
			meta = _.get(datasets, dsID),
			hasGenes = _.get(meta, 'probeMap');

		this.setState({dataset: _.assoc(dataset, tab, dsID), editor: _.assoc(editor, tab, {hasGenes, genes: hasGenes})});
		callback(['edit-dataset', tab, dsID, meta]);
	},
	onTabSelect: function (tab) {
		this.setState({tab});
	},
	render: function () {
		var {dataset, tab, editor = {}} = this.state,
			{appState: {cohort, datasets, columnEdit, features}} = this.props,
			{onSelect, setEditorState} = this,
			getColumnEditFor = getColumnEdit(columnEdit, features, editor, dataset, datasets, onSelect, setEditorState),
			getFieldSpecFor = getFieldSpec(features, editor, dataset, datasets),
			// key on cohort id, or on position? The ds can be null.
			applyAll = () => cohort.map((c, i) => getFieldSpecFor(i));

		var editors = cohort.map(({name}, i) => getColumnEditFor(name, i));

		// XXX why is this.props put on the Modal? Seems wrong.
		return (
			<Modal {...this.props} show={true} className='columnEdit container'>
				<Modal.Header closeButton>
					<Modal.Title>Column Fields</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<Tabs activeKey={tab} onSelect={this.onTabSelect}>
						 {editors}
					</Tabs>
					<form className='form-horizontal'>
						<div className='form-group'>
							<Button disabled={!validColumn(cohort, dataset, datasets, editor)}
									onClick={() => this.addColumn(applyAll())} className='col-md-offset-10'>Apply</Button>
						</div>
					</form>
				</Modal.Body>
			</Modal>
		);
	}
});

module.exports = ColumnEdit;
