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
		<GeneSuggest
			error={props.error}
			value={props.value}
			onKeyDown={returnPressed(props.onReturn)}
			onChange={props.onFieldChange}
			type='text'/>
		<XCheckboxGroup
			label='Assay Type'
			additionalAction={!_.isEmpty(props.preferred) && (props.advanced ? 'Show Basic' : 'Show Advanced')}
			onAdditionalAction={props.onAdvancedClick}
			onChange={props.onChange}
			options={selectedOptions(props.selected,
				props.advanced ? datasetList(props.datasets) :
					preferredList(props.preferred))}/>
	</div>);

var featureLabel = (list, f) => {
	var match = _.findWhere(list, {dsID: f.dsID, value: f.feature});
	return _.get(match, 'label', f.feature);
};

var phenotypeList = (preferred, features) => ([{
	options: preferred.map(f => {
		var label = featureLabel(features, f);
		return {label: label, value: JSON.stringify(f)};
	})
}]);

var allPhenotypeList = features => ([{
	options: features.map(f => {
		return {label: _.get(f, 'label', f.feature), value: JSON.stringify({dsID: f.dsID, feature: f.value})};
	})
}]);

var PhenotypicForm = props => {
	var options = selectedOptions(props.selected,
			props.advanced ? allPhenotypeList(props.features) : phenotypeList(props.phenotypes, props.features));
	return (
		<div>
			<XCheckboxGroup
				label='Phenotype'
				additionalAction={!_.isEmpty(props.phenotypes) && (props.advanced ? 'Show Basic' : 'Show All')}
				onAdditionalAction={props.onAdvancedClick}
				onChange={props.onChange}
				options={options}/>
			<PhenotypeSuggest
				error={props.error}
				value={props.value}
				features={props.features}
				onSuggestionSelected={(ev, {suggestion: {label}}) => props.onAddPhenotype(label)}
				onKeyDown={returnPressed(props.onAddPhenotype)}
				onChange={props.onFieldChange} type='text'/>
		</div>);
};

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm
};

var isValueValid = {
	Genotypic: value => value.trim().length > 0,
	Phenotypic: () => true
};

var isValid = {
	Genotypic: (value, selected) => isValueValid.Genotypic(value) && selected.length > 0,
	Phenotypic: (value, selected) => selected.length > 0
};

var applyInitialState = {
	Genotypic: (fields, dataset, datasets, features, preferred, defaults) => {
		var mode = 'Genotypic',
			isPreferred = _.contains(_.pluck(preferred, 'dsID'), dataset),
			value = fields.join(' '),
			selected = [dataset],
			valid = isValid[mode](value, selected);

		return _.assocIn(defaults,
			['mode'], mode,
			['advanced', mode], !isPreferred,
			['value', mode], value,
			['selected', mode, !isPreferred], selected,
			['valid'], valid);
	},
	Phenotypic: (fields, dataset, datasets, features, preferred, defaults) => {
		var mode = 'Phenotypic',
			phenotype = {dsID: dataset, feature: _.findWhere(features, {value: fields[0]}).value},
			selected = [JSON.stringify(phenotype)],
			valid = isValid[mode]('', selected);

		return _.assocIn(defaults,
			['mode'], mode,
			['phenotypes'], _.uniq([...defaults.phenotypes, phenotype]),
			['selected', mode, false], selected,
			['valid'], valid);
	}
};

var datasetMode = (datasets, dataset) =>
	notIgnored(datasets[dataset]) ? 'Genotypic' : 'Phenotypic';

// if phenotype, ensure that the chosen feature is in phenotypes, and
// check it. Always start in basic mode.
//function applyInitialState(fields, dataset, datasets, features, preferred, defaults) {
//	var isGenomic = notIgnored(datasets[dataset]),
//		mode = isGenomic ? 'Genotypic' : 'Phenotypic',
//		isPreferred = _.contains(_.pluck(preferred, 'dsID'), dataset),
//		value = isGenomic ? fields.join(' ') :
//			_.findWhere(features, {value: fields[0]}).label,
//		selected = isGenomic ? [dataset] : [],
//		valid = isValid[mode](value, selected);
//
//	return _.assocIn(defaults,
//		['mode'], mode,
//		['advanced'], isGenomic && !isPreferred,
//		['value', mode], value,
//		['selected', !isPreferred], selected,
//		['valid'], valid);
//}

var matchDatasetFields = multi((datasets, dsID) => {
	var meta = datasets[dsID];
	return meta.type === 'genomicMatrix' && meta.probemap ? 'genomicMatrix-probemap' : meta.type;
});

// XXX The error handling here isn't great, because it can leave us with a
// field of the wrong case, e.g. foxm1 vs. FOXM1, or treat a probe as a gene.
// However, it's better to handle it than to lose the observable, which wedges
// the widget. Better handling would warn the user and wait for the network
// error to clear.

// default to probes
matchDatasetFields.dflt = (datasets, dsID, fields) =>
	xenaQuery.matchFields(dsID, fields).map(fields => ({
		type: 'probes',
		fields
	})).catch(err => {
		console.log(err);
		return Rx.Observable.of({type: 'probes', fields: fields});
	});

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
	}).catch(err => {
		console.log(err);
		return Rx.Observable.of({type: 'genes', fields: fields});
	});
});

function matchAssembly(datasets, dsID, fields) {
	var ref = xenaQuery.refGene[datasets[dsID].assembly];
	return xenaQuery.sparseDataMatchField(ref.host, 'name2', ref.name, fields).map(fields => ({
		type: 'genes',
		fields
	})).catch(err => {
		console.log(err);
		return Rx.Observable.of({type: 'genes', fields: fields});
	});
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
		// Be sure to handle leading and trailing commas, as might occur during user edits
		let fields = value.trim().replace(/^,+|,+$/g, '').split(/[\s,]+/);
		return Rx.Observable.zip(
			...selected.map(dsID => matchDatasetFields(datasets, dsID, fields)),
			(...matches) => ({matches, valid: true}));
	}
	return Rx.Observable.of({valid: false});
}

var VariableSelect = React.createClass({
	mixins: [rxEventsMixin, deepPureRenderMixin],
	getInitialState() {
		var {fields, dataset, datasets, features, preferred, preferredPhenotypes, mode = 'Genotypic'} = this.props;
		var defaults = {
			mode,
			advanced: {
				Genotypic: _.isEmpty(preferred),
				Phenotypic: _.isEmpty(preferredPhenotypes)
			},
			phenotypes: preferredPhenotypes,
			selected: {
				Genotypic: {
					true: [], // advanced
					false: [] // !advanced
				},
				Phenotypic: {
					true: [], // advanced
					false: [] // !advanced
				}
			},
			value: {
				Genotypic: '',
				Phenotypic: ''
			},
			valid: false
		};
		return fields && dataset ?
			applyInitialState[datasetMode(datasets, dataset)](fields, dataset, datasets, features, preferred, defaults) : defaults;
	},
	componentWillMount() {
		this.events('mode', 'advanced', 'field', 'dataset');
		var mode = this.ev.mode.startWith(this.state.mode),
			advanced = this.ev.advanced
				.withLatestFrom(mode, (advanced, mode) => mode)
				.scan((advanced, mode) => _.updateIn(advanced, [mode], a => !a), this.state.advanced)
				.startWith(this.state.advanced),
			selected = this.ev.dataset
				.withLatestFrom(advanced, mode, (dataset, advanced, mode) => ([dataset, mode, advanced[mode]]))
				.scan((selected, [{selectValue, isOn}, mode, advanced]) =>
					_.updateIn(selected, [mode, advanced], selected => (isOn ? _.conj : _.without)(selected, selectValue)),
					this.state.selected)
				.startWith(this.state.selected),
			value = this.ev.field
				.withLatestFrom(mode, (field, mode) => ([field, mode]))
				.scan((value, [field, mode]) => _.assoc(value, mode, field), this.state.value)
				.startWith(this.state.value);

		this.modeSub = mode.subscribe(mode => this.setState({mode, error: false}));
		this.advancedSub = advanced.subscribe(advanced => this.setState({advanced}));
		this.selectedSub = selected.subscribe(selected => this.setState({selected}));
		this.valueSub = value.subscribe(value => this.setState({value, error: false}));

		// valid should only be set true after assessing disposition, but should be set false immediately on
		// user input.
		this.validSub = mode.combineLatest(advanced, selected, value,
				(mode, advanced, selected, value) => ([mode, selected[mode][advanced[mode]], value[mode]]))
			.do(() =>this.setState({valid: false, loading: true})) // XXX side-effects
			.debounceTime(200).switchMap(([mode, selected, value]) =>
					matchFields(this.props.datasets, this.props.features, mode, selected, value))
			.subscribe(valid => this.setState({loading: false, ...valid}), err => {console.log(err); this.setState({valid: false, loading: false});});
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
		var {pos, onSelect} = this.props,
			{mode, advanced, valid, matches} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[mode][advanced[mode]];

		if (valid) {
			if (mode === 'Genotypic') {
				onSelect(pos, value, selected, matches);
			} else {
				let features = selected.map(s => JSON.parse(s)),
					datasets = _.pluck(features, 'dsID'),
					fields = features.map(f => ({fields: [f.feature]}));
				onSelect(pos, "", datasets, fields);
			}
		}
	},
	onDoneInvalid() {
		var {features} = this.props,
			{mode} = this.state,
			value = this.state.value[mode];

		if (!isValueValid[mode](value, features)) {
			this.setState({error: true});
		}
	},
	onAddPhenotype(valueIn) {
		var {features} = this.props,
			{phenotypes, value, mode} = this.state,
			match = _.findWhere(features, {label: valueIn || value[mode]});
		if (match) {
			let newPheno = {dsID: match.dsID, feature: match.value};
			if (!_.findWhere(phenotypes, newPheno)) {
				this.setState({phenotypes: _.uniq([...phenotypes, newPheno])});
				this.on.dataset({selectValue: JSON.stringify(newPheno), isOn: true});
				this.on.field("");
			}
		}
	},
	render() {
		var {mode, advanced, valid, loading, error, phenotypes} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[mode][advanced[mode]],
			{colId, controls, datasets, features, preferred, title, helpText, width} = this.props,
			contentSpecificHelp = _.getIn(helpText, [mode]),
			ModeForm = getModeFields[mode],
			wizardProps = {
				colId,
				controls,
				title,
				contentSpecificHelp,
				onDone: this.onDone,
				onDoneInvalid: this.onDoneInvalid,
				valid,
				loading,
				width
			},
			dataTypeProps = {
				label: 'Select Data Type',
				value: mode,
				onChange: this.on.mode,
				options: [{label: 'Genomic', value: 'Genotypic'}, {label: 'Phenotypic', value: 'Phenotypic'}]
			};
		return (
			<WizardCard {...wizardProps}>
				<XRadioGroup {...dataTypeProps} />
				<ModeForm
					error={error}
					onChange={this.onChange}
					onReturn={this.onDone}
					onFieldChange={this.on.field}
					datasets={datasets}
					selected={selected}
					value={value}
					features={features}
					preferred={preferred}
					phenotypes={phenotypes}
					onAddPhenotype={this.onAddPhenotype}
					onAdvancedClick={this.on.advanced}
					advanced={advanced[mode]}/>
			</WizardCard>);
	}
});

module.exports = VariableSelect;
