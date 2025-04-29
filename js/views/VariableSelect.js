import PureComponent from '../PureComponent';
var React = require('react');
import {Box} from '@material-ui/core';
var _ = require('../underscore_ext').default;
import XAutocompleteSuggest from './XAutocompleteSuggest';
import XRadioGroup from './XRadioGroup.js';
import GeneSuggest from './GeneSuggest.js';
import { WizardCard } from './WizardCard.js';
import { rxEvents } from '../react-utils.js';
import parsePos from '../parsePos.js';
import { ignoredType, isPhenotype } from '../models/dataType.js';
import {matchDatasetFields} from '../models/columns';
var {Observable, Scheduler} = require('../rx').default;
import {getOpts} from '../columnsParam';
var {servers} = require('../defaultServers');

// Styles
var sxSuggestForm = {
	display: 'flex',
	flexDirection: 'column',
	gridGap: 16,
	minWidth: 0
};

const LOCAL_DOMAIN = servers.localHub;
const LOCAL_DOMAIN_LABEL = 'My Computer Hub';

var notIgnored = ds => !_.contains(ignoredType, ds.type) && !isPhenotype(ds);

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

var assemblyColors = {
	hg18: '#527DA4',
	hg19: '#ff5722',
	hg38: '#77ADA7',
	default: '#999999'
};

var assemblyColor = assembly => _.get(assemblyColors, assembly, assemblyColors.default);

var getAssembly = _.curry((datasets, dsID) =>
	_.getIn(datasets, [dsID, 'assembly'],
		_.getIn(datasets, [dsID, 'probemapMeta', 'assembly'])));

var setBadge = datasets => ds =>
	_.Let((assembly = getAssembly(datasets, ds.value)) =>
		assembly ? {
			...ds,
			badge: {label: assembly, style: {color: assemblyColor(assembly)}}
		} : ds);

var setAssembly = (datasets, groups) =>
	groups.map(group => _.updateIn(group, ['options'], list =>
				list.map(setBadge(datasets))));

var defaultAssembly = 'hg38';
// For gene lookup, use the first assembly we find. If no datasets
// are selected, use a default so the user can get gene suggestions before
// selecting a dataset.
var firstAssembly = (datasets, selected) =>
	selected.length === 0 ? defaultAssembly :
	_.findValue(selected, getAssembly(datasets));

var formActions = (onAdvancedClick, advanced) => [{
	onToggle: onAdvancedClick,
	selected: !advanced,
	value: 'basic'
}, {
	onToggle: onAdvancedClick,
	selected: advanced,
	value: 'advanced'
}];


var GenotypicForm = props => (
	<Box sx={sxSuggestForm}>
		<GeneSuggest
			dataset={props.selected.length === 1 &&
				_.indexOf(['genomicMatrix', 'clinicalMatrix'], props.datasets[props.selected[0]].type) !== -1 ?
				props.selected[0] : undefined}
			assembly={firstAssembly(props.datasets, props.selected)}
			value={props.value}
			onChange={props.onFieldChange}
			onPending={props.onPending}
			suggestProps={{error: props.error, ...props.suggestProps}}
			type='text'/>
		<XAutocompleteSuggest
			actions={!_.isEmpty(props.preferred) ? formActions(props.onAdvancedClick, props.advanced) : null}
			hideBadge={props.hideAssembly}
			onChange={props.onChange}
			onPending={props.onPending}
			options={setAssembly(props.datasets, props.advanced ? datasetList(props.datasets) : preferredList(props.preferred))}
			selectedValues={props.selected}
			suggestProps={{formLabel: 'Dataset', placeholder: 'Select Dataset'}}/>
	</Box>
);

var basicFeatureLabels = (features, basicFeatures) => basicFeatures.map(i => ({value: i.toString(), label: features[i].label}));

var allFeatureLabels = features => features.map((f, i) => ({value: i.toString(), label: f.label}));

var PhenotypicForm = props => {
	var options = (props.advanced ? allFeatureLabels : basicFeatureLabels)(props.features, _.union(props.basicFeatures, props.selected));
	return (
		<Box sx={sxSuggestForm}>
			<XAutocompleteSuggest
				actions={!_.isEmpty(props.basicFeatures) ? formActions(props.onAdvancedClick, props.advanced) : null}
				onChange={props.onChange}
				onPending={props.onPending}
				options={[{options}]}
				selectedValues={props.selected}
				suggestProps={{error: Boolean(props.error), ...props.suggestProps}}/>
		</Box>);
};

var AnalyticForm = props => {
	var options = props.analytic.map(({label}, i) => ({value: i.toString(), label: label}));
	return (
		<Box sx={sxSuggestForm}>
			<XAutocompleteSuggest
				onChange={props.onChange}
				onPending={props.onPending}
				options={[{options}]}
				selectedValues={props.selected}
				suggestProps={{...props.suggestProps}}/>
		</Box>);
};

var getModeFields = {
	Genotypic: GenotypicForm,
	Phenotypic: PhenotypicForm,
	Analytic: AnalyticForm
};

var getModeSuggestProps = {
	Genotypic: {
		formLabel: 'Add Gene or Position',
		placeholder: 'Select Gene or Position'
	},
	Phenotypic: {
		formLabel: 'Phenotype',
		placeholder: 'Select Phenotype'
	},
	Analytic: {
		formLabel: 'Variable',
		placeholder: 'Select Variable'
	},
};

var applyInitialState = {
	Genotypic: (text, fields, dataset, datasets, features, preferred, defaults) => {
		var mode = 'Genotypic',
			isPreferred = _.contains(_.pluck(preferred, 'dsID'), dataset),
			// old bookmarks may not have a 'text' property
			value = text || fields.join(' '),
			selected = [dataset];

		return _.assocIn(defaults,
			['mode'], mode,
			['advanced', mode], !isPreferred,
			['value', mode], value,
			['selected', mode, !isPreferred], selected);
	},
	Phenotypic: (text, fields, dataset, datasets, features, preferred, defaults) => {
		var mode = 'Phenotypic',
			i = _.findIndex(features, _.matcher({dsID: dataset, name: fields[0]})).toString(),
			selected = [i];

		return i === '-1' ?
			_.assocIn(defaults, ['unavailable'], true) :
			_.assocIn(defaults,
				['mode'], mode,
				['basicFeatures'], defaults.basicFeatures,
				['selected', mode, false], selected,
				['selected', mode, true], selected);
	},
	'undefined': (text, fields, dataset, datasets, features, preferred, defaults) =>
		_.assocIn(defaults, ['unavailable'], true)
};

var datasetMode = (datasets, dataset) =>
	datasets[dataset] ? (notIgnored(datasets[dataset]) ? 'Genotypic' : 'Phenotypic') :
		undefined;

var pluralDataset = i => i === 1 ? 'A dataset' : 'Some datasets';
var pluralDo = i => i === 1 ? 'does' : 'do';
//var pluralHas = i => i === 1 ? 'has' : 'have';

function getWarningText(matches, datasets, selected, topWarnings, value) {
	var pos = parsePos(value),
		warnings = _.groupBy(matches, m => m.warning),
		unsupported = _.getIn(warnings, ['position-unsupported', 'length'], 0),
		uwarn = unsupported ? [`${pluralDataset(unsupported)} in your selection ${pluralDo(unsupported)} not support a chromosome view.`] : [],
		probes = _.getIn(warnings, ['too-many-probes', 'length'], 0),
		max = _.min(warnings['too-many-probes'], m => m.end),
		pwarn = probes && pos ? [`There are too many data points to display. Please try a smaller region like ${pos.chrom}:${max.start}-${max.end}.`] : [];

	return [...topWarnings, ...uwarn, ...pwarn];
}

var featureIndexes = (features, list) =>
	list.map(f => _.findIndex(features, _.matcher(f)).toString()).filter(x => x !== "-1");

var toDsID = ({host, name}) => JSON.stringify({host, name});

var doMatch = (datasets, dsID, field, opts = []) =>
	matchDatasetFields(datasets, dsID, field)
		.map(r => ({...r, dataset: datasets[dsID], opts}));

var assemblyError = 'Your dataset selections include two different assemblies. For chromosome coordinates, the assembly must be unique.';
var fieldError = 'None of these fields are available on all selected datasets.';
var sigError = 'Unable to parse signature.';

function intersectFields(matches) {
	if (matches.length === 0) {
		return matches;
	}
	var intersection = _.filterIndices(matches[0].fields, (f, i) => _.every(matches, m => m.fields[i]));
	return _.map(matches, m => _.updateIn(m, ['fields'], fields => intersection.map(i => fields[i])));
}

var fieldAssembly = datasets => match => getAssembly(datasets, match.dataset.dsID);

var genomicMatches = (datasets, text) => matchesIn => {
	var matches = intersectFields(matchesIn),
		{hasCoord} = parsePos(text) || {},
		assemblies = _.uniq(_.map(matches, fieldAssembly(datasets)).filter(x => x)),
		assembly = hasCoord && assemblies.length > 1 ? [assemblyError] : [],
		nomatch = matches.length && matches[0].fields.length === 0 ?  [fieldError] : [],
		sig = text.trim()[0] === '=' && !_.getIn(matches, [0, 'sig']),
		// With a signature error, the other errors are not meaningful.
		warnings = sig ? [sigError] : [...assembly, ...nomatch];

	return {
		matches,
		hasCoord,
		warnings,
		valid: !_.any(matches, m => m.warning) && _.isEmpty(warnings)
	};
};

// This is still kinda wonky, dispatching on mode before dispatching on type.
var matchFields = {
	Phenotypic: ({datasets, features}, selected) =>
		Observable.zipArray(
			...selected.map(i =>
				doMatch(datasets, features[i].dsID, features[i].name)))
		.map(matches => ({matches, valid: selected.length > 0})),

	Genotypic: ({datasets}, selected, text) =>
		text.trim().length === 0 || !selected.length ? Observable.of({valid: false}, Scheduler.asap) :
		Observable.zipArray(
			...selected.map(dsID => doMatch(datasets, dsID, text)))
		.map(genomicMatches(datasets, text)),

	Analytic: ({datasets, analytic}, selected) =>
		Observable.zipArray(
			...selected.map(i =>
				doMatch(datasets, toDsID(analytic[i]), analytic[i].fields, getOpts(analytic[i]))))
		.map(matches => ({matches, valid: selected.length > 0}))
};

class VariableSelect extends PureComponent {
	constructor(props) {
		super(props);
		var {text, fields, dataset, datasets, features, preferred, basicFeatures, mode = 'Genotypic'} = props;
		var defaults = {
			mode,
			advanced: {
				Genotypic: _.isEmpty(preferred),
				Phenotypic: _.isEmpty(basicFeatures),
				Analytic: false
			},
			basicFeatures: featureIndexes(features, basicFeatures),
			pending: false,
			selected: {
				Genotypic: {
					true: [], // advanced
					false: [] // !advanced
				},
				Phenotypic: {
					true: [], // advanced
					false: [] // !advanced
				},
				Analytic: {
					false: []
				}
			},
			value: {
				Genotypic: '',
				Phenotypic: '',
				Analytic: ''
			},
			valid: false,
			hasCoord: false,
			warnings: []
		};

		this.state = fields && dataset ?
			applyInitialState[datasetMode(datasets, dataset)](text, fields, dataset, datasets, features, preferred, defaults) : defaults;
	}

	UNSAFE_componentWillReceiveProps({features, basicFeatures}) {//eslint-disable-line camelcase
		this.setState({
			basicFeatures: featureIndexes(features, basicFeatures),
		});
	}

	// Sharing these streams, to avoid recompute, is complicated by the
	// startWith() operator, which does not subscribe to base observable until
	// the queued value is emitted. The result of this is that the
	// withLatestFrom() operators do not subscribe to their upstream sources,
	// and miss the startWith() of those. The workaround here is to use replay
	// subjects. This is all much too complex.
	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		var events = rxEvents(this, 'mode', 'advanced', 'field', 'select');
		var mode = events.mode.startWith(this.state.mode).publishReplay(1).refCount(),
			advanced = events.advanced
				.withLatestFrom(mode, (advanced, mode) => mode)
				.scan((advanced, mode) => _.updateIn(advanced, [mode], a => !a), this.state.advanced)
				.startWith(this.state.advanced).publishReplay(1).refCount(),
			selected = events.select
				.withLatestFrom(advanced, mode, (dataset, advanced, mode) => ([dataset, mode, advanced[mode]]))
				.scan((selected, [{selectValue}, mode, advanced]) =>
						_.assocIn(selected, [mode, advanced], selectValue), this.state.selected)
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
					matchFields[mode](this.props, selected, value))
			.subscribe(valid => this.setState({loading: false, warnings: [], matches: [], ...valid}), err => {console.log(err); this.setState({valid: false, loading: false});});
	}

	componentWillUnmount() {
		this.modeSub.unsubscribe();
		this.advancedSub.unsubscribe();
		this.selectedSub.unsubscribe();
		this.valueSub.unsubscribe();
		this.validSub.unsubscribe();
	}

	onChange = (selectValue) => {
		this.on.select({selectValue});
	};

	onDone = () => {
		var {pos, onSelect} = this.props,
			{matches} = this.state;

		onSelect(pos, matches);
	};

	onDoneInvalid = () => {
		var {mode} = this.state,
			value = this.state.value[mode];

		// Highlight the input field, since the user has forgotten it.
		// Might want to also scroll it into position, and also
		// scroll it into position if there's another error, like
		// assembly mismatch.
		if (mode === 'Genotypic' && value.trim().length === 0) {
			this.setState({error: true});
		}
	};

	onPending = (pending) => {
		this.setState({pending});
	};

	render() {
		var {mode, matches, hasCoord, advanced, valid, warnings,
				loading, error, unavailable, basicFeatures, pending} = this.state,
			value = this.state.value[mode],
			selected = this.state.selected[mode][advanced[mode]],
			{colHeight, colId, colMode, controls, datasets, features, helpText, preferred, analytic,
				onWizardMode, optionalExit, title, width} = this.props,
			formError = getWarningText(matches, datasets, selected, warnings, value).join(' ')
				|| error,
			subtitle = unavailable ? 'This variable is currently unavailable. You may choose a different variable, or cancel to continue viewing the cached data.' : undefined,
			subheader = _.getIn(helpText, [mode]),
			suggestProps = getModeSuggestProps[mode],
			ModeForm = getModeFields[mode],
			wizardProps = {
				colHeight,
				colId,
				colMode,
				controls,
				onWizardMode,
				optionalExit,
				subheader,
				subtitle,
				pending,
				title,
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
				options: [
					{label: 'Genomic', value: 'Genotypic'},
					{label: 'Phenotypic', value: 'Phenotypic'},
					...(!_.isEmpty(analytic) ? [{label: 'Analytic', value: 'Analytic'}] : [])
				]
			};

		return (
			<WizardCard {...wizardProps}>
				<XRadioGroup {...dataTypeProps} />
				<ModeForm
					error={formError}
					onChange={this.onChange}
					onFieldChange={this.on.field}
					onPending={this.onPending}
					hideAssembly={!hasCoord}
					datasets={datasets}
					selected={selected}
					value={value}
					features={features}
					preferred={preferred}
					analytic={analytic}
					basicFeatures={basicFeatures}
					onAdvancedClick={this.on.advanced}
					advanced={advanced[mode]}
					suggestProps={suggestProps}/>
			</WizardCard>);
	}
}

// Render a load warning in a wrapper component so we don't
// try to initialize state when we're not holding the cohort
// data. There might be a better state model that avoids this.
//
// We are passed data incrementally as it arrives from the servers,
// so use a timeout to decide if we should keep waiting.
class LoadingNotice extends React.Component {
	state={wait: true};

	UNSAFE_componentWillMount() {//eslint-disable-line camelcase
		this.timeout = setTimeout(() => this.setState({wait: false}), 3000);
	}

	componentWillUnmount() {
		clearTimeout(this.timeout);
	}

	render() {
		var {analytic, preferred, datasets, features, basicFeatures} = this.props,
			{wait} = this.state;
		if (wait && (!preferred || _.isEmpty(datasets) || _.isEmpty(features) || !basicFeatures || !analytic)) {
			let {colId, colMode, controls, optionalExit, title, width} = this.props,
				wizardProps = {
					colId,
					colMode,
					controls,
					loading: true,
					loadingCohort: true,
					optionalExit,
					title,
					width
				};
			return <WizardCard {...wizardProps}/>;
		}
		return <VariableSelect {...this.props}/>;
	}
}

export default LoadingNotice;
