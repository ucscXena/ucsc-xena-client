'use strict';
import PureComponent from '../PureComponent';

var React = require('react');
var _ = require('../underscore_ext');
var CohortOrDisease = require('../views/CohortOrDisease');
var VariableSelect = require('../views/VariableSelect');
var GhostVariableSelect = require('../views/GhostVariableSelect');
var getStepperState = require('./getStepperState');
var uuid = require('../uuid');
var Rx = require('../rx');
import {computeSettings, typeWidth} from '../models/columns';

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
var getByCohort = (table, cohort, def) => _.get(table, cohortName(cohort), def);

function getPreferedDatasets(cohort, cohortPreferred, hubs, datasets) {
	if (!cohortPreferred) {
		return; // signify 'not loaded'
	}
	var active = activeHubs(hubs),
		// Only include datasets on active hubs & real existing datasets (more
		// reliable against mistakes in the .json file)
		avail = ds => _.contains(active, JSON.parse(ds).host) && _.has(datasets, ds),
		// filter out key used to support geneset/pathway view
		notPathway = (ds, key) => key !== "copy number for pathway view",
		preferred = _.pick(getByCohort(cohortPreferred, cohort, {}),
			(ds, key) => avail(ds) && notPathway(ds, key));

	// Use isEmpty to handle 1) no configured preferred datasets or 2)
	// preferred dataset list is empty after filtering by active hubs.
	return _.isEmpty(preferred) ? [] : _.keys(preferred).map(type =>
		({dsID: preferred[type], label: preferredLabels[type]}));
}

function getAnalytic(cohort, cohortAnalytic, hubs, datasets) {
	if (!cohortAnalytic) {
		return; // signify 'not loaded'
	}
	var active = activeHubs(hubs),
		// Only include datasets on active hubs & real existing datasets (more reliable against mistakes in the .json file)
		analytic = _.filter(getByCohort(cohortAnalytic, cohort, []),
			ds => _.Let((dsID = JSON.stringify(_.pick(ds, 'host', 'name'))) =>
				_.contains(active, ds.host) && _.has(datasets, dsID)));

	return _.isEmpty(analytic) ? [] : analytic;
}

function getPreferredPhenotypes(cohort, cohortPreferredPhenotypes, hubs) {
	if (!cohortPreferredPhenotypes) {
		return; // signify 'not loaded'
	}
	var active = activeHubs(hubs),
		preferred = _.filter(getByCohort(cohortPreferredPhenotypes, cohort, []),
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

		onDatasetSelect = (posOrId, selected) => {
			var {wizard: {datasets, features}} = this.props,
				isPos = _.isNumber(posOrId),
				settingsList = _.map(selected, s =>
					computeSettings(datasets, features, s.opts, s.dataset.dsID, s));
			this.props.callback(['add-column', posOrId,
				...settingsList.map((settings, i) => ({id: !i && !isPos ? posOrId : uuid(), settings}))]);
		};
		addColumns() {
			var {children, appState, wizard} = this.props,
				{cohort, wizardMode, defaultWidth, servers} = appState,
				{cohorts, cohortPreferred, cohortAnalytic, cohortMeta,
					cohortPhenotype, datasets, features} = wizard,
				stepperState = getStepperState(appState),
				{editing} = appState,
				analytic = getAnalytic(cohort, cohortAnalytic, servers, datasets),
				preferred = getPreferedDatasets(cohort, cohortPreferred, servers, datasets),
				preferredPhenotypes = getPreferredPhenotypes(cohort, cohortPhenotype, servers),
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
					analytic: analytic,
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
							text={appState.columns[editing].value}
							fields={appState.columns[editing].fieldList || appState.columns[editing].fields}
							dataset={appState.columns[editing].dsID}
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
