'use strict';

var React = require('react');
var _ = require('../underscore_ext');
var XCheckboxGroup = require('./XCheckboxGroup');
var XRadioGroup = require('./XRadioGroup');
var WizardCard = require('./WizardCard');
var GeneSuggest = require('./GeneSuggest');
var PhenotypeSuggest = require('./PhenotypeSuggest');
var {rxEvents, deepPureRenderMixin} = require('../react-utils');
var xenaQuery = require('../xenaQuery');
var Rx = require('../rx');
var multi = require('../multi');
var parseGeneSignature = require('../parseGeneSignature');
var parseInput = require('../parseInput');

const LOCAL_DOMAIN = 'https://local.xena.ucsc.edu:7223';
const LOCAL_DOMAIN_LABEL = 'My Computer Hub';

const ignoredType = ['probeMap', 'genePredExt', 'probemap', 'sampleMap']; // Important for unassigned cohort
const ignoredClinical = (type, subtype) =>
	type === 'clinicalMatrix' && !subtype || subtype.match(/^phenotypes?|filter/i);

var notIgnored = ({type, dataSubType}) => !_.contains(ignoredType, type) &&
	!ignoredClinical(type, dataSubType);

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

var basicFeatureLabels = (features, basicFeatures) => basicFeatures.map(i => ({value: i.toString(), label: features[i].label}));

var allFeatureLabels = features => features.map((f, i) => ({value: i.toString(), label: f.label}));

var PhenotypicForm = props => {
	var options = (props.advanced ? allFeatureLabels : basicFeatureLabels)(props.features, props.basicFeatures);
	return (
		<div>
			<XCheckboxGroup
				label='Phenotype'
				additionalAction={props.advanced ? 'Show Basic' : 'Show All'}
				onAdditionalAction={props.onAdvancedClick}
				onChange={props.onChange}
				options={selectedOptions(props.selected, [{options}])}/>
			{props.advanced ?
				null :
				(<PhenotypeSuggest
					error={props.error}
					value={props.value}
					features={props.features}
					onSuggestionSelected={(ev, {suggestion}) => props.onAddFeature(suggestion)}
					onKeyDown={returnPressed(props.onAddFeature)}
					onChange={props.onFieldChange} type='text'/>)}
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
			i = _.findIndex(features, _.matcher({dsID: dataset, name: fields[0]})).toString(),
			selected = [i],
			valid = isValid[mode]('', selected);

		return _.assocIn(defaults,
			['mode'], mode,
			['basicFeatures'], _.uniq([...defaults.basicFeatures, i]),
			['selected', mode, false], selected,
			['valid'], valid);
	}
};

var datasetMode = (datasets, dataset) =>
	notIgnored(datasets[dataset]) ? 'Genotypic' : 'Phenotypic';

var matchDatasetFields = multi((datasets, dsID, fields, isSignature) => {
	var meta = datasets[dsID];
	return meta.type === 'genomicMatrix' && meta.probemap && !isSignature ? 'genomicMatrix-probemap' : meta.type;
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
		let sig = parseGeneSignature(value.trim()),
			fields = sig ? sig.genes : parseInput(value);
		return Rx.Observable.zip(
			...selected.map(dsID => matchDatasetFields(datasets, dsID, fields, sig)),
			(...matches) => ({matches, valid: true}));
	}
	return Rx.Observable.of({valid: false});
}

var featureIndexes = (features, list) =>
	list.map(f => _.findIndex(features, _.matcher(f)).toString()).filter(x => x !== "-1");

var VariableSelect = React.createClass({
	mixins: [deepPureRenderMixin],
	getInitialState() {
		var {fields, dataset, datasets, features, preferred, basicFeatures, mode = 'Genotypic'} = this.props;
		var defaults = {
			mode,
			advanced: {
				Genotypic: _.isEmpty(preferred),
				Phenotypic: false
			},
			basicFeatures: featureIndexes(features, basicFeatures),
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
	componentWillReceiveProps({features, basicFeatures}) {
		this.setState({
			basicFeatures: featureIndexes(features, basicFeatures),
		});
	},
	// Sharing these streams, to avoid recompute, is complicated by the
	// startWith() operator, which does not subscribe to base observable until
	// the queued value is emitted. The result of this is that the
	// withLatestFrom() operators do not subscribe to their upstream sources,
	// and miss the startWith() of those. The workaround here is to use replay
	// subjects. This is all much too complex.
	componentWillMount() {
		var events = rxEvents(this, 'mode', 'advanced', 'field', 'select');
		var mode = events.mode.startWith(this.state.mode).publishReplay(1).refCount(),
			advanced = events.advanced
				.withLatestFrom(mode, (advanced, mode) => mode)
				.scan((advanced, mode) => _.updateIn(advanced, [mode], a => !a), this.state.advanced)
				.startWith(this.state.advanced).publishReplay(1).refCount(),
			selected = events.select
				.withLatestFrom(advanced, mode, (dataset, advanced, mode) => ([dataset, mode, advanced[mode]]))
				.scan((selected, [{selectValue, isOn}, mode, advanced]) =>
					_.updateIn(selected, [mode, advanced], selected => _.uniq((isOn ? _.conj : _.without)(selected, selectValue))),
					this.state.selected)
				.startWith(this.state.selected).publishReplay(1).refCount(),
			value = events.field
				.withLatestFrom(mode, (field, mode) => ([field, mode]))
				.scan((value, [field, mode]) => _.assoc(value, mode, field), this.state.value)
				.startWith(this.state.value).publishReplay(1).refCount();

		this.modeSub = mode.subscribe(mode => this.setState({mode, error: false}));
		this.advancedSub = advanced.subscribe(advanced => this.setState({advanced}));
		this.selectedSub = selected.subscribe(selected => this.setState({selected}));
		this.valueSub = value.subscribe(value => this.setState({value, error: false}));

		// valid should only be set true after assessing disposition, but should be set false immediately on
		// user input.
		this.validSub = mode.combineLatest(advanced, selected, value,
				(mode, advanced, selected, value) => ([mode, selected[mode][advanced[mode]], value[mode]]))
			.do(() => this.setState({valid: false, loading: true})) // XXX side-effects
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
		this.on.select({selectValue, isOn});
	},
	onDone() {
		var {pos, features, onSelect} = this.props,
			{mode, advanced, valid, matches} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[mode][advanced[mode]];

		if (valid) {
			if (mode === 'Genotypic') {
				onSelect(pos, value, selected, matches);
			} else {
				let selectedFeatures = selected.map(s => features[s]),
					datasets = _.pluck(selectedFeatures, 'dsID'),
					fields = selectedFeatures.map(f => ({fields: [f.name]}));
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
	onAddFeature(featureIn) {
		var {features} = this.props,
			{basicFeatures, value, mode} = this.state,
			i = (featureIn ? features.indexOf(featureIn) : _.findIndex(features, _.matcher({label: value[mode]}))).toString();
		
		if (i !== "-1") {
			this.setState({basicFeatures: _.uniq([...basicFeatures, i])});
			this.on.select({selectValue: i, isOn: true});
			this.on.field("");
		}
		
		if (i === "-1") {
			this.on.field("");
		}
	},
	render() {
		var {mode, advanced, valid, loading, error, basicFeatures} = this.state,
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
					basicFeatures={basicFeatures}
					onAddFeature={this.onAddFeature}
					onAdvancedClick={this.on.advanced}
					advanced={advanced[mode]}/>
			</WizardCard>);
	}
});

// Render a load warning in a wrapper component so we don't
// try to initialize state when we're not holding the cohort
// data. There might be a better state model that avoids this.
//
// Cohort data is expected to be falsey if not loaded, empty
// if loaded but nothing for this cohort, or non-empty otherwise.
var LoadingNotice = React.createClass({
	render() {
		var {preferred, datasets, features, basicFeatures} = this.props;
		if (!preferred || !datasets || !features || !basicFeatures) {
			let {colId, controls, title, width} = this.props,
				wizardProps = {
					colId,
					controls,
					title,
					loading: true,
					loadingCohort: true,
					width
				};
			return <WizardCard {...wizardProps}/>;
		}
		return <VariableSelect {...this.props}/>;
	}
});

module.exports = LoadingNotice;
