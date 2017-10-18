'use strict';
var React = require('react');
var _ = require('../underscore_ext');
var {deepPureRenderMixin} = require('../react-utils');
var CohortOrDisease = require('../views/CohortOrDisease');
var VariableSelect = require('../views/VariableSelect');
var GhostVariableSelect = require('../views/GhostVariableSelect');
var getStepperState = require('./getStepperState');
var trim = require('underscore.string').trim;
var {getColSpec} = require('../models/datasetJoins');
var {defaultColorClass} = require('../heatmapColors');
var uuid = require('../uuid');
var Rx = require('../rx');

/*function toWordList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,| |\n|\t/), s => trim(s), _.identity));
}*/

var typeWidth = {
	matrix: 136,
	chrom: 200
};

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
	if (type === 'clinicalMatrix') {
		return valuetype === 'category' ? 'coded' : 'float';
	}
	return 'float';
}

function getFieldType(dataset, features, fields, probes) {
	if (dataset.type === 'mutationVector') {
		return dataset.dataSubType.search(/SV|structural/i) !== -1 ? 'SV' : 'mutation';
	}
	if (dataset.type === 'genomicSegment') {
		return 'segmented';
	}
	if (dataset.type === 'clinicalMatrix') {
		return 'clinical';
	}
	return  probes ? 'probes' : (fields.length > 1 ? 'genes' : 'geneProbes');
}

// XXX handle position in all genomic datatypes?
var parsePos = require('../parsePos');
function columnSettings(datasets, features, dsID, input, fields, probes) {
	var meta = datasets[dsID],
		pos = parsePos(trim(input), meta.assembly),
		fieldType = getFieldType(meta, features[dsID], fields, probes),
		normalizedFields = pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] :
			((['segmented', 'mutation', 'SV'].indexOf(fieldType) !== -1) ? [fields[0]] : fields).map(f => f ? f : "[unknown]");

	// My god, this is a disaster.
	return {
		fields: normalizedFields,
		fetchType: 'xena',
		valueType: getValueType(meta, features[dsID], fields),
		fieldType: fieldType,
		dsID,
		defaultNormalization: meta.colnormalization,
		// XXX this assumes fields[0] doesn't appear in features if ds is genomic
		//fieldLabel: _.getIn(features, [dsID, fields[0], 'longtitle'], fields.join(', ')),
		fieldLabel: _.getIn(features, [dsID, fields[0], 'longtitle']) || normalizedFields.join(', '),
		colorClass: defaultColorClass,
		assembly: meta.assembly
	};
}

// Configuration for first and second variable select cards that are displayed during wizard.
var variableSelectConfig = {
	'FIRST_COLUMN': {
		helpText: {
			'Genotypic': 'Add a gene (e.g. RB1) or position (e.g. chr19p), and select a dataset.',
			'Phenotypic': 'Add a phenotype (e.g. sample type, age).'
		},
		pos: 1,
		title: 'First Variable'
	},
	'SECOND_COLUMN': {
		helpText: {
			'Genotypic': 'Add a gene (e.g. RB1) or position (e.g. chr19p), and select a dataset.',
			'Phenotypic': 'Add a phenotype (e.g. sample type, age).'
		},
		pos: 2,
		title: 'Second Variable'
	}
};

function wizardColumns(wizardMode, stepperState, cohortSelectProps, datasetSelectProps, width) {
	if (wizardMode) {
		if (stepperState === 'COHORT') {
			return [
				<CohortOrDisease {...cohortSelectProps}/>,
				<GhostVariableSelect width={width} {...variableSelectConfig.FIRST_COLUMN}/>,
				<GhostVariableSelect width={width} {...variableSelectConfig.SECOND_COLUMN}/>];
		}
		if (stepperState === 'FIRST_COLUMN') {
			return [
				<VariableSelect {...variableSelectConfig[stepperState]} {...datasetSelectProps}/>,
				<GhostVariableSelect width={width} {...variableSelectConfig.SECOND_COLUMN} />];
		}
		if (stepperState === 'SECOND_COLUMN') {
			return [
				<VariableSelect {...variableSelectConfig[stepperState]} {...datasetSelectProps}/>];
		}
	}
	return [];
}

var preferredLabels = {
	'gene expression': 'Gene Expression',
	'copy number': 'Copy Number',
	'simple somatic mutation': 'Somatic Mutation'
};

var activeHubs = hubs => _.keys(hubs).filter(hub => hubs[hub].user);
var cohortName = cohort => _.getIn(cohort, [0, 'name']);
var getCohortPreferred = (table, cohort) => _.get(table, cohortName(cohort));

function getPreferedDatasets(cohort, cohortPreferred, hubs) {
	var active = activeHubs(hubs),
		// Only include datasets on active hubs.
		preferred = _.pick(getCohortPreferred(cohortPreferred, cohort),
							ds => _.contains(active, JSON.parse(ds).host));
	// Use isEmpty to handle 1) no configured preferred datasets or 2) preferred dataset list
	// is empty after filtering by active hubs.
	return _.isEmpty(preferred) ? null : _.keys(preferred).map(type =>
			({dsID: preferred[type], label: preferredLabels[type]}));
}

function getPreferredPhenotypes(cohort, cohortPreferredPhenotypes, hubs) {
	var active = activeHubs(hubs),
		preferred = _.filter(getCohortPreferred(cohortPreferredPhenotypes, cohort),
			({dsID}) => _.contains(active, JSON.parse(dsID).host));

	return _.isEmpty(preferred) ? [] : preferred;
}

var stripFields = f => ({dsID: f.dsID, label: (f.longtitle || f.name), value: f.name});

var consolidateFeatures = featureSet => {
	return _.reduce(featureSet, (all, features, dsID) => {
		let strippedFeatures = _.toArray(_.mapObject(features, f =>
			_.extend(stripFields(f), {dsID: dsID})));
		return all.concat(strippedFeatures);
	}, []);
};

var sortFeatures = features => _.sortBy(features, f => f.label.toUpperCase());

var removeSampleID = features => _.filter(features, f => f.value !== "sampleID");


var computeSettings = _.curry((datasets, features, inputFields, width, dataset, matches) => {
	var ds = datasets[dataset];
	var settings = columnSettings(datasets, features, dataset, inputFields, matches.fields, matches.type === 'probes'),
		colSpec = getColSpec([settings], datasets),
		columnLabel = ((ds.dataSubType && !ds.dataSubType.match(/phenotype/i)) ? (ds.dataSubType + ' - ') : '') +
			(ds.dataSubType && ds.dataSubType.match(/phenotype/i) ? '' : ds.label);

	return _.assoc(colSpec,
		'width', _.contains(['mutationVector', 'segmented'], ds.type) ? typeWidth.chrom : typeWidth.matrix,
		'columnLabel', columnLabel,
		'user', {columnLabel: columnLabel, fieldLabel: colSpec.fieldLabel});
});

// 1) if appState.editing, then set editing state, and render editor.
// 2) if wizard mode
//      add cohort editor, or
//      add 1st column editor, or
//      add 2nd column editor
function addWizardColumns(Component) {
	return React.createClass({
		mixins: [deepPureRenderMixin],
		displayName: 'SpreadsheetWizardColumns',
		getInitialState() {
			var {editing} = this.props;
			return {editing};
		},
		componentWillMount() {
			var {callback} = this.props;
			this.sub = Rx.Observable.of(true)
				.concat(Rx.Observable.fromEvent(window, 'resize'))
				.debounceTime(200).subscribe(() =>
					callback(['viewportWidth', document.documentElement.clientWidth]));
		},
		componentWillUnmount() {
			this.sub.unsubscribe();
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
		onCancel() {
			this.props.callback(['edit-column', null]);
		},
		onCohortSelect(cohort) {
			this.props.callback(['cohort', 0, cohort, typeWidth.matrix]);
		},
		onDatasetSelect(posOrId, input, datasetList, fieldList) {
			var {datasets, features, defaultWidth} = this.props.appState,
				isPos = _.isNumber(posOrId),
				settingsList = _.mmap(datasetList, fieldList, computeSettings(datasets, features, input, defaultWidth));
			this.props.callback(['add-column', posOrId,
					...settingsList.map((settings, i) => ({id: !i && !isPos ? posOrId : uuid(), settings}))]);
		},
		render() {
			var {children, appState} = this.props,
				{cohort, cohorts, cohortPreferred, cohortPhenotype, cohortMeta,
					wizardMode, datasets, features, defaultWidth, servers} = appState,
				stepperState = getStepperState(appState),
				{editing} = appState,
				preferred = getPreferedDatasets(cohort, cohortPreferred, servers),
				preferredPhenotypes = getPreferredPhenotypes(cohort, cohortPhenotype, servers),
				width = defaultWidth,
				cohortSelectProps = {
					cohorts,
					cohortMeta,
					onSelect: this.onCohortSelect,
					width},
				datasetSelectProps = {
					datasets,
					features: sortFeatures(removeSampleID(consolidateFeatures(features))),
					preferred,
					preferredPhenotypes,
					onSelect: this.onDatasetSelect,
					width},
				columns = React.Children.toArray(children),
				cancelIcon = <i className='material-icons' onClick={this.onCancel}>cancel</i>,
				withEditor = columns.map(el =>
						editing === el.props.id ?
							<VariableSelect
								actionKey={editing}
								pos={editing}
								fields={appState.columns[editing].fieldSpecs[0].fields}
								dataset={appState.columns[editing].fieldSpecs[0].dsID}
								title='Edit Variable'
								{...datasetSelectProps}
								colId={el.props.label}
								controls={cancelIcon}/> : el),
				withNewColumns = _.flatmap(withEditor, (el, i) =>
						editing === i ? [el, <VariableSelect actionKey={i} pos={i} title='Add Variable'
															 {...datasetSelectProps} controls={cancelIcon}/>] : [el]);
			return (
				<Component {...this.props}>
					{withNewColumns.concat(
						wizardColumns(wizardMode, stepperState, cohortSelectProps, datasetSelectProps, width))}
				</Component>);
		}
	});
}

module.exports = addWizardColumns;
