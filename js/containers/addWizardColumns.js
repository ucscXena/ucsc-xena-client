'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var CohortOrDisease = require('../views/CohortOrDisease');
var VariableSelect = require('../views/VariableSelect');
var ColumnInlineEditor = require('../views/ColumnInlineEditor');
var getStepperState = require('./getStepperState');
var trim = require('underscore.string').trim;
var {getColSpec} = require('../models/datasetJoins');
var {defaultColorClass} = require('../heatmapColors');
var uuid = require('../uuid');

function toWordList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,| |\n|\t/), s => trim(s), _.identity));
}

// 'features' is a problem here, because they are not unique across datasets.
// How do we look up features w/o a dataset?
function getValueType(dataset, features, fields) {
	var {type} = dataset,
		valuetype = _.getIn(features, [fields[0], 'valuetype']);

	if (type === 'mutationVector') {
		return 'mutation';
	}
	if (type === 'genomicSegment') {
		return 'segmented';
	}
	if (type === 'phenotype') {
		return valuetype === 'category' ? 'coded' : 'float';
	}
	return 'float';
}

function getFieldType(dataset, features, fields, probes) {
	if (dataset.type === 'mutationVector') {
		return 'mutation';
	}
	if (dataset.type === 'genomicSegment') {
		return 'segmented';
	}
	if (dataset.type === 'phenotype') {
		return 'clinical';
	}
	return  probes ? 'probes' : (fields.length > 1 ? 'genes' : 'geneProbes');
}

// XXX handle position in all genomic datatypes?
var parsePos = require('../parsePos');
function columnSettings(datasets, features, dsID, input, probes) {
	var meta = datasets[dsID],
		pos = parsePos(trim(input), meta.assembly),
		fields = toWordList(input);
	// My god, this is a disaster.
	return {
		fields: pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] : fields,
		fetchType: 'xena',
		valueType: getValueType(meta, features, fields),
		fieldType: getFieldType(meta, features, fields, probes),
		dsID,
		defaultNormalization: meta.colnormalization,
		// XXX this assumes fields[0] doesn't appear in features if ds is genomic
		fieldLabel: _.get(features, [fields[0], 'longtitle'], fields.join(', ')),
		colorClass: defaultColorClass,
		assembly: meta.assembly
	};
}

function wizardColumns(wizardMode, stepperState, cohortSelectProps, datasetSelectProps) {
	if (wizardMode) {
		if (stepperState === 'COHORT') {
			return [<CohortOrDisease {...cohortSelectProps}/>];
		}
		if (_.contains(['FIRST_COLUMN', 'SECOND_COLUMN'], stepperState)) {
			return [<VariableSelect {...datasetSelectProps}/>];
		}
	}
	return [];
}

var preferredLabels = {
	'gene expression': 'Gene Expresion',
	'copy number': 'Copy Number',
	'simple somatic mutation': 'Somatic Mutation'
};

function getPreferedDatasets(cohort, cohortPreferred) {
	var preferred = _.get(cohortPreferred, _.getIn(cohort, [0, 'name']));
	return preferred ? _.keys(preferred).map(type =>
			({dsID: preferred[type], label: preferredLabels[type]})) : null;
}

var computeSettings = _.curry((datasets, features, fields, dataset) => {
	var ds = datasets[dataset];
	// XXX resolve 'probes' if user has selected probes. Set here to false
	var settings = columnSettings(datasets, features, dataset, fields, false),
		colSpec = getColSpec([settings], datasets);

	return _.assoc(colSpec,
		'width', ds.type === 'mutationVector' ? 200 : 100,
		'columnLabel', ds.label,
		'user', {columnLabel: ds.label, fieldLabel: colSpec.fieldLabel});
});

// 1) if appState.editing, then set editing state, and render editor.
// 2) if wizard mode
//      add cohort editor, or
//      add 1st column editor, or
//      add 2nd column editor
function addWizardColumns(Component) {
	return React.createClass({
		mixins: [deepPureRenderMixin],
		displayName: 'SpreadsheetColumnAdd',
		getInitialState() {
			var {editing} = this.props;
			return {editing};
		},
		componentWillReceiveProps: function(newProps) {
			var {editing} = newProps;
			// XXX set timeout here for flipping back, when done.
			this.setState({editing});
			// XXX If we had a cohort but lost it (e.g. due to change in servers),
			// and the columnEdit is closed: open it.
//			if (!this.state.openColumnEdit &&
//				this.props.appState.cohort[0] &&
//				!newProps.appState.cohort[0]) {
//
//				this.setState({openColumnEdit: true});
//			}
		},
		onCohortSelect(cohort) {
			this.props.callback(['cohort', 0, cohort]);
		},
		onDatasetSelect(input, datasetList) {
			// XXX need to remap features
			var {datasets, features} = this.props.appState;
			var settingsList = datasetList.map(computeSettings(datasets, features, input));
			this.props.callback(['add-column',
					..._.flatmap(settingsList, settings => ({id: uuid(), settings}))]);
		},
		render() {
			var {children, appState} = this.props,
				{cohort, cohorts, cohortPreferred, cohortMeta, wizardMode, datasets} = appState,
				stepperState = getStepperState(appState),
				{editing} = this.state,
				preferred = getPreferedDatasets(cohort, cohortPreferred),
				cohortSelectProps = {cohorts, cohortMeta, onSelect: this.onCohortSelect},
				datasetSelectProps = {datasets, preferred, onSelect: this.onDatasetSelect},
				withEditor = React.Children.map(children, el =>
						editing === el.props.id ? <ColumnInlineEditor column={el} editor='editor'/> : el);
			return (
				<Component {...this.props}>
					{withEditor.concat(
						wizardColumns(wizardMode, stepperState, cohortSelectProps, datasetSelectProps))}
				</Component>);
		}
	});
}

module.exports = addWizardColumns;
