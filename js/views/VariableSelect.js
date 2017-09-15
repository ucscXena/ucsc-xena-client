'use strict';

var React = require('react');
var _ = require('../underscore_ext');
//var trim = require('underscore.string').trim;
var XCheckboxGroup = require('./XCheckboxGroup');
var XRadioGroup = require('./XRadioGroup');
var WizardCard = require('./WizardCard');
var GeneSuggest = require('./GeneSuggest');
var PhenotypeSuggest = require('./PhenotypeSuggest');
var {rxEventsMixin, deepPureRenderMixin} = require('../react-utils');
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx');
var multi = require('../multi');

const LOCAL_DOMAIN = 'https://local.xena.ucsc.edu:7223';
const LOCAL_DOMAIN_LABEL = 'My Computer Hub';

const ignoredType = ['probeMap', 'genePredExt', 'probemap', 'sampleMap']; // Important for unassigned cohort
const ignoredSubtype = ['Filter', 'filter', 'phenotype', 'phenotypes', 'Phenotype', 'Phenotypes']; // XXX Looks brittle. use regex?

var notIgnored = ({type, dataSubType}) => !_.contains(ignoredType, type) && !_.contains(ignoredSubtype, dataSubType);

var category = ({dsID, dataSubType}) =>
	dsID.includes(LOCAL_DOMAIN) ? LOCAL_DOMAIN_LABEL : (dataSubType ? dataSubType : 'others');

function createLabels(datasets) {
	var sorted = _.sortBy(datasets, ds => ds.label.toLowerCase()),
		labels = _.uniquify(_.pluck(sorted, 'label'));
	return _.mmap(sorted, labels, ({dsID}, label) => ({value: dsID, label}));
}

// Create dataset list. Sorts by category and label, and enforces unique labels by
// appending a suffix.
function datasetList(datasets) {
	var groups = _.fmap(_.groupBy(_.values(datasets).filter(notIgnored), category),
		createLabels);
	return _.sortBy(_.keys(groups), g => g.toLowerCase()).map(group => ({
		label: group,
		options: groups[group]
	}));
}

var preferredList = preferred => ([
	{
		options: preferred.map(({dsID, label}) => ({value: dsID, label}))
	}
]);

var RETURN = 13;
var returnPressed = cb => ev => ev.keyCode === RETURN && cb();

function selectedOptions(selected, options) {
	var smap = new Set(selected);
	return options.map(group =>
			_.updateIn(group, ['options'],
				options => options.map(opt => smap.has(opt.value) ?
					_.assoc(opt, 'checked', true) : opt)));
}

var GenotypicForm = props => (
	<div>
		<GeneSuggest value={props.value} onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} type='text'/>
		<XCheckboxGroup
			label='Assay Type'
			additionalAction={!_.isEmpty(props.preferred) && (props.advanced ? 'Show Basic' : 'Show Advanced')}
			onAdditionalAction={props.onAdvancedClick}
			onChange={props.onChange}
			options={selectedOptions(props.selected,
				props.advanced ? datasetList(props.datasets) :
					preferredList(props.preferred))}/>
	</div>);

var PhenotypicForm = props => (
	<div>
		<PhenotypeSuggest value={props.value} features={props.features} onKeyDown={returnPressed(props.onReturn)} onChange={props.onFieldChange} type='text'/>
	</div>);

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm
};

var isValid = {
	Genotypic: (value, selected) => value.trim().length > 0 && selected.length > 0,
	Phenotypic: (value, selected, features) => _.findWhere(features, {label: value})
};

function applyInitialState(fields, dataset, datasets, features, preferred, defaults) {
	var isGenomic = notIgnored(datasets[dataset]),
		mode = isGenomic ? 'Genotypic' : 'Phenotypic',
		isPreferred = _.contains(_.pluck(preferred, 'dsID'), dataset),
		value = isGenomic ? fields.join(' ') :
			_.findWhere(features, {value: fields[0]}).label,
		selected = isGenomic ? [dataset] : [],
		valid = isValid[mode](value, selected, features);

	return _.assocIn(defaults,
		['mode'], mode,
		['advanced'], isGenomic && !isPreferred,
		['value', mode], value,
		['selected', !isPreferred], selected,
		['valid'], valid);
}

var matchDatasetFields = multi((datasets, dsID) => {
	var meta = datasets[dsID];
	return meta.type === 'genomicMatrix' && meta.probemap ? 'genomicMatrix-probemap' : meta.type;
});

// default to probes
matchDatasetFields.dflt = (datasets, dsID, fields) =>
	xenaQuery.matchFields(dsID, fields).map(fields => ({
		type: 'probes',
		fields
	}));

matchDatasetFields.add('genomicMatrix-probemap', (datasets, dsID, fields) => {
	const {host} = JSON.parse(dsID);
	return Rx.Observable.zip(
		xenaQuery.sparseDataMatchGenes(host, datasets[dsID].probemap, fields),
		xenaQuery.matchFields(dsID, fields),
		(genes, probes) => _.filter(probes, _.identity).length > _.filter(genes, _.identity).length ?
			{
				type: 'probes',
				fields: probes
			} : {
				type: 'genes',
				fields: genes
			});
});

function matchAssembly(datasets, dsID, fields) {
	var ref = xenaQuery.refGene[datasets[dsID].assembly];
	return xenaQuery.sparseDataMatchField(ref.host, 'name2', ref.name, fields).map(fields => ({
		type: 'genes',
		fields
	}));
}

matchDatasetFields.add('genomicSegment', matchAssembly);
matchDatasetFields.add('mutationVector', matchAssembly);

// need to handle
// phenotypic,
// null field, null dataset
// sparse,
// dense with probemap,
// dense without probemap
function matchFields(datasets, features, mode, selected, value) {
	if (mode === 'Phenotypic') {
		return Rx.Observable.of({valid: isValid.Phenotypic(value, selected, features)});
	}
	if (isValid.Genotypic(value, selected)) {
		let fields = value.trim().split(/[ ,]/);
		return Rx.Observable.zip(
			...selected.map(dsID => matchDatasetFields(datasets, dsID, fields)),
			(...matches) => ({matches, valid: true}));
	}
	return Rx.Observable.of({valid: false});
}

var VariableSelect = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	getInitialState() {
		var {fields, dataset, datasets, features, preferred, mode = 'Genotypic'} = this.props;
		var defaults = {
			mode,
			advanced: _.isEmpty(preferred),
			selected: {
				true: [], // advanced
				false: [] // !advanced
			},
			value: {
				Genotypic: '',
				Phenotypic: ''
			},
			valid: false
		};
		return fields && dataset ?
			applyInitialState(fields, dataset, datasets, features, preferred, defaults) : defaults;
	},
	componentWillMount() {
		this.events('mode', 'advanced', 'field', 'dataset');
		var mode = this.ev.mode.startWith(this.state.mode),
			advanced = this.ev.advanced.scan(a => !a, this.state.advanced).startWith(this.state.advanced),
			selected = this.ev.dataset.withLatestFrom(advanced, (dataset, advanced) => ([dataset, advanced]))
				.scan((selected, [{selectValue, isOn}, advanced]) =>
					_.updateIn(selected, [advanced], selected => (isOn ? _.conj : _.without)(selected, selectValue)),
					this.state.selected).startWith(this.state.selected),
			value = this.ev.field.withLatestFrom(mode, (field, mode) => ([field, mode]))
				.scan((value, [field, mode]) => _.assoc(value, mode, field), this.state.value).startWith(this.state.value);

		this.modeSub = mode.subscribe(mode => this.setState({mode}));
		this.advancedSub = advanced.subscribe(advanced => this.setState({advanced}));
		this.selectedSub = selected.subscribe(selected => this.setState({selected}));
		this.valueSub = value.subscribe(value => this.setState({value}));

		// XXX there may be a race here, where user changes the input, making the fields invalid, but
		// we wait 200ms to set 'valid'. Need to instead reset valid immediately, and then update matches.
		// valid should only be set true after assessing disposition, but should be set false immediately on
		// user input.
		this.validSub = mode.combineLatest(advanced, selected, value,
				(mode, advanced, selected, value) => ([mode, advanced, selected, value]))
			.debounceTime(200).switchMap(([mode, advanced, selected, value]) =>
					matchFields(this.props.datasets, this.props.features, mode, selected[advanced], value[mode]))
			.subscribe(valid => this.setState(valid));
	},
	componentWillUnmount() {
		this.modeSub.unsubscribe();
		this.advancedSub.unsubscribe();
		this.selectedSub.unsubscribe();
		this.valueSub.unsubscribe();
		this.validSub.unsubscribe();
	},
	onChange(selectValue, isOn) {
		this.on.dataset({selectValue, isOn});
	},
	onDone() {
		var {features, pos, onSelect} = this.props,
			{mode, advanced, valid, matches} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[advanced];

		if (valid) {
			if (mode === 'Genotypic') {
				onSelect(pos, value, selected, matches);
			} else {
				let feature = _.findWhere(features, {label: value});
				onSelect(pos, feature.value, [feature.dsID], [{fields: [feature.value]}]);
			}
		}
	},
	render() {
		var {mode, advanced, valid} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[advanced],
			{colId, controls, datasets, features, preferred, title, helpText, width} = this.props,
			contentSpecificHelp = _.getIn(helpText, [mode]),
			ModeForm = getModeFields[mode];

		var wizardProps = {colId, controls, title, contentSpecificHelp, onDone: this.onDone, valid, width};
		var dataTypeProps = {
			label: 'Data Type',
			value: mode,
			onChange: this.on.mode,
			options: [{label: 'Genomic', value: 'Genotypic'}, {label: 'Phenotypic', value: 'Phenotypic'}]
		};
		return (
			<WizardCard {...wizardProps}>
				<XRadioGroup {...dataTypeProps} />
				<ModeForm
					onChange={this.onChange}
					onReturn={this.onDone}
					onFieldChange={this.on.field}
					datasets={datasets}
					selected={selected}
					value={value}
					features={features}
					preferred={preferred}
					onAdvancedClick={this.on.advanced}
					advanced={advanced}/>
			</WizardCard>);
	}
});

module.exports = VariableSelect;
