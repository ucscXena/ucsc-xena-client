'use strict';
import PureComponent from '../PureComponent';

var React = require('react');
var _ = require('../underscore_ext');
var CohortOrDisease = require('../views/CohortOrDisease');
var VariableSelect = require('../views/VariableSelect');
var GhostVariableSelect = require('../views/GhostVariableSelect');
var getStepperState = require('./getStepperState');
var {getColSpec} = require('../models/datasetJoins');
var {defaultColorClass} = require('../heatmapColors');
var uuid = require('../uuid');
var Rx = require('../rx');
var parsePos = require('../parsePos');
var parseGeneSignature = require('../parseGeneSignature');
var parseInput = require('../parseInput');
var {signatureField} = require('../models/fieldSpec');

/*function toWordList(str) {
	// Have to wrap trim because it takes a 2nd param.
	return _.filter(_.map(str.split(/,| |\n|\t/), s => s.trim(), _.identity));
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

function getFieldType(dataset, features, fields, probes, pos) {
	if (dataset.type === 'mutationVector') {
		return dataset.dataSubType.search(/SV|structural/i) !== -1 ? 'SV' : 'mutation';
	}
	if (dataset.type === 'genomicSegment') {
		return 'segmented';
	}
	if (dataset.type === 'clinicalMatrix') {
		return 'clinical';
	}
	// We treat probes in chrom view (pos) as geneProbes
	return  probes ? 'probes' : ((fields.length > 1 && !pos) ? 'genes' : 'geneProbes');
}

function sigFields(fields, {genes, weights}) {
	return {
		missing: genes.filter((p, i) => !fields[i]),
		genes: fields.filter(p => p),
		weights: weights.filter((p, i) => fields[i])
	};
}

// XXX duplicated in VariableSelect.
var getAssembly = (datasets, dsID) =>
	_.getIn(datasets, [dsID, 'assembly'],
		_.getIn(datasets, [dsID, 'probemapMeta', 'assembly']));

var getDefaultVizSettings = meta =>
	// use default vizSettings if we have min and max.
	_.has(meta, 'min') && _.has(meta, 'max') ? {vizSettings: _.pick(meta, 'min', 'max', 'minstart', 'maxstart')} : {};

// XXX handle position in all genomic datatypes?
function columnSettings(datasets, features, dsID, input, fields, probes) {
	var meta = datasets[dsID],
		pos = parsePos(input.trim(), getAssembly(datasets, dsID)),
		sig = parseGeneSignature(input.trim()),
		fieldType = getFieldType(meta, features[dsID], fields, probes, pos),
		fieldsInput = sig ? sig.genes : parseInput(input),
		normalizedFields = (
			pos ? [`${pos.chrom}:${pos.baseStart}-${pos.baseEnd}`] :
				((['segmented', 'mutation', 'SV'].indexOf(fieldType) !== -1) ?
					[fields[0]] : fields).map((f, i) => f ? f : fieldsInput[i] + " (unknown)"));

	// My god, this is a disaster.
	if (sig) {
		let {missing, genes, weights} = sigFields(fields, sig),
			missingLabel = _.isEmpty(missing) ? '' : ` (missing terms: ${missing.join(', ')})`;
		return signatureField('signature' + missingLabel, {
			signature: ['geneSignature', dsID, genes, weights],
			missing,
			fieldType: 'probes',
			defaultNormalization: meta.colnormalization,
			colorClass: defaultColorClass,
			fields: [input],
			dsID
		});
	}

	return {
		...(fieldType === 'geneProbes' ? {showIntrons: true} : {}),
		...(_.getIn(meta, ['probemapMeta', 'dataSubType']) === 'regulon' ? {clustering: 'probes'} : {}),
		...(getDefaultVizSettings(meta)),
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
		assembly: meta.assembly || _.getIn(meta, ['probemapMeta', 'assembly'])
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
				<CohortOrDisease key='c1' {...cohortSelectProps}/>,
				<GhostVariableSelect key='c2' width={width} {...variableSelectConfig.FIRST_COLUMN}/>,
				<GhostVariableSelect key='c3' width={width} {...variableSelectConfig.SECOND_COLUMN}/>];
		}
		if (stepperState === 'FIRST_COLUMN') {
			return [
				<VariableSelect key='c2' {...variableSelectConfig[stepperState]} {...datasetSelectProps}/>,
				<GhostVariableSelect key='c3' width={width} {...variableSelectConfig.SECOND_COLUMN} />];
		}
		if (stepperState === 'SECOND_COLUMN') {
			return [
				<VariableSelect key='c3' {...variableSelectConfig[stepperState]} {...datasetSelectProps}/>];
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
var cohortName = cohort => _.get(cohort, 'name');
var getCohortPreferred = (table, cohort) => _.get(table, cohortName(cohort));

function getPreferedDatasets(cohort, cohortPreferred, hubs, datasets) {
	var active = activeHubs(hubs),
		// Only include datasets on active hubs & real existing datasets (more reliable against mistakes in the .json file)
		preferred = _.pick(getCohortPreferred(cohortPreferred, cohort),
			ds => _.contains(active, JSON.parse(ds).host) && _.has(datasets, ds));

	// filter out key used to support geneset/pathway view
	preferred = _.pick(preferred, (ds, key) => key !== "copy number for pathway view");

	// Use isEmpty to handle 1) no configured preferred datasets or 2) preferred dataset list
	// is empty after filtering by active hubs.
	return _.isEmpty(preferred) ? [] : _.keys(preferred).map(type =>
		({dsID: preferred[type], label: preferredLabels[type]}));
}

function getPreferredPhenotypes(cohort, cohortPreferredPhenotypes, hubs) {
	var active = activeHubs(hubs),
		preferred = _.filter(getCohortPreferred(cohortPreferredPhenotypes, cohort),
			({dsID}) => _.contains(active, JSON.parse(dsID).host));

	return _.isEmpty(preferred) ? [] : preferred;
}

var consolidateFeatures = featureSet => {
	return _.reduce(featureSet, (all, features, dsID) => {
		let strippedFeatures = _.toArray(_.mapObject(features, f =>
			_.merge(f, {dsID: dsID, label: (f.longtitle || f.name)})));
		return all.concat(strippedFeatures);
	}, []);
};

var sortFeatures = features => _.sortBy(features, f => f.label.toUpperCase());

var removeSampleID = features => _.filter(features, f => f.name !== "sampleID");


var computeSettings = _.curry((datasets, features, inputFields, width, dataset, matches) => {
	var ds = datasets[dataset];
	var settings = columnSettings(datasets, features, dataset, inputFields, matches.fields, matches.type === 'probes'),
		colSpec = getColSpec([settings], datasets),
		columnLabel = ((ds.dataSubType && !ds.dataSubType.match(/phenotype/i)) ? (ds.dataSubType + ' - ') : '') +
			(ds.dataSubType && ds.dataSubType.match(/phenotype/i) ? '' : ds.label);

	return _.assoc(colSpec,
		'width', _.contains(['mutationVector', 'segmented'], ds.type) ? typeWidth.chrom : typeWidth.matrix,
		'dataset', ds,
		'columnLabel', columnLabel,
		'user', {columnLabel: columnLabel, fieldLabel: colSpec.fieldLabel});
});

// 1) if appState.editing, then set editing state, and render editor.
// 2) if wizard mode
//      add cohort editor, or
//      add 1st column editor, or
//      add 2nd column editor
function addWizardColumns(Component) {
	return class extends PureComponent {
		static displayName = 'SpreadsheetWizardColumns';

		constructor(props) {
			super(props);
			var {editing} = props;
			this.state = {editing};
		}

		componentWillMount() {
			var {callback} = this.props;
			this.sub = Rx.Observable.of(true)
				.concat(Rx.Observable.fromEvent(window, 'resize'))
				.filter(() => !window.cypressScreenshot) // cypress work-around
				.debounceTime(200).subscribe(() =>
					callback(['viewportWidth', document.documentElement.clientWidth]));
		}

		componentWillUnmount() {
			this.sub.unsubscribe();
		}

		componentWillReceiveProps(newProps) {
			var {editing} = newProps;
			this.setState({editing});
		}

		onCancel = () => {
			this.props.callback(['edit-column', null]);
		};

		onCohortSelect = (cohort) => {
			this.props.callback(['cohort', cohort, typeWidth.matrix]);
		};

		onDatasetSelect = (posOrId, input, datasetList, fieldList) => {
			var {wizard: {datasets, features}, appState: {defaultWidth}} = this.props,
				isPos = _.isNumber(posOrId),
				settingsList = _.mmap(datasetList, fieldList, computeSettings(datasets, features, input, defaultWidth));
			this.props.callback(['add-column', posOrId,
				...settingsList.map((settings, i) => ({id: !i && !isPos ? posOrId : uuid(), settings}))]);
		};

		addColumns() {
			var {children, appState, wizard} = this.props,
				{cohort, wizardMode, defaultWidth, servers} = appState,
				{cohorts, cohortPreferred, cohortMeta,
					cohortPhenotype, datasets, features} = wizard,
				stepperState = getStepperState(appState),
				{editing} = appState,
				preferred = cohortPreferred && getPreferedDatasets(cohort, cohortPreferred, servers, datasets),
				preferredPhenotypes = cohortPhenotype && getPreferredPhenotypes(cohort, cohortPhenotype, servers),
				width = defaultWidth,
				cohortSelectProps = {
					cohorts,
					cohortMeta,
					onSelect: this.onCohortSelect,
					width},
				datasetSelectProps = {
					datasets,
					features: features && sortFeatures(removeSampleID(consolidateFeatures(features))),
					preferred,
					basicFeatures: preferredPhenotypes,
					onSelect: this.onDatasetSelect,
					width},
				columns = React.Children.toArray(children),
				cancelIcon = <i className='material-icons' onClick={this.onCancel}>cancel</i>,
				withEditor = columns.map(el =>
					editing === el.props.id ?
						<VariableSelect
							key={editing}
							actionKey={editing}
							pos={editing}
							fields={appState.columns[editing].fieldSpecs[0].fields}
							dataset={appState.columns[editing].fieldSpecs[0].dsID}
							title='Edit Variable'
							{...datasetSelectProps}
							colId={el.props.label}
							controls={cancelIcon}/> : el),
				withNewColumns = _.flatmap(withEditor, (el, i) =>
						editing === i ? [el, <VariableSelect key={i} actionKey={i} pos={i} title='Add Variable'
															 {...datasetSelectProps} controls={cancelIcon}/>] : [el]);
			return withNewColumns.concat(
				wizardColumns(wizardMode, stepperState, cohortSelectProps, datasetSelectProps, width));
		}

		render() {
			var {children, appState: {editing, wizardMode}} = this.props,
				columns = editing != null || wizardMode ? this.addColumns() :
					// This looks like a noop, but toArray changes element keys. If
					// we don't do this, there's a mismatch in keys during editing,
					// which causes expensive re-mounts.
					React.Children.toArray(children);
			return (
				<Component {...this.props}>
					{columns}
				</Component>);
		}
	};
}

module.exports = addWizardColumns;
