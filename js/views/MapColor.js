import PureComponent from '../PureComponent';
import { Fragment } from 'react';

import {assoc, assocIn, concat, contains, every, filter, find, flatmap, get,
	getIn, identity, insert, isEqual, keys, last, Let, mapObject, max, omit,
	pick, pluck, sortByI, splice} from '../underscore_ext.js';

import {Chip, ListSubheader, MenuItem, Slider} from '@material-ui/core';
import {el, div, label} from '../chart/react-hyper';
import {cellTypeValue, datasetCohort, getDataSubType, hasCellType,
	hasDatasource, hasDonor, hasGene, hasGeneSet, hasSignatureScore, hasOther,
	hasTransferProb, phenoValue, probValue, sigValue} from '../models/singlecell';
import {scaleParams} from '../colorScales';
import geneDatasetSuggest from './GeneDatasetSuggest';
import xSelect from './xSelect';
import densityPlot from './densityPlot';
import styles from './MapColor.module.css';

var menuItem = el(MenuItem);
var slider = el(Slider);
var listSubheader = el(ListSubheader);
var fragment = el(Fragment);
var chip = el(Chip);

var hasOtherOrScores = (state, {type, multi} = {}) =>
	hasOther(state, type && {type}) ||
		multi && (hasTransferProb(state, {type}) || hasSignatureScore(state, {type}));

var hasMode = {
	datasource: hasDatasource,
	donor: hasDonor,
	type: hasCellType,
	prob: hasTransferProb,
	sig: hasSignatureScore,
	gene: hasGene,
	geneSet: hasGeneSet,
	other: hasOtherOrScores
};

var availModes = (state, pred) => !datasetCohort(state) ? [] :
	keys(hasMode).filter(mode => hasMode[mode](state, pred));

var ident = (...a) => a.filter(identity);

/*
 * cell type and transferred label options
 */
var cellTypeOpts = state =>
	Let((cohort = datasetCohort(state),
			{cellType: {[cohort]: cellType},
			 signature: {[cohort]: signature},
			 labelTransfer: {[cohort]: labelTransfer}} = state) => ident(
		cellType.length && [listSubheader('Cell types / clusters'),
			...sortByI(cellType, 'label').map(value => menuItem({value}, value.label))],
		labelTransfer.length && [listSubheader('Transferred cell types / clusters'),
			...sortByI(labelTransfer, 'label').map(value => menuItem({value}, value.label))],
		signature.length && [listSubheader('Cell types by gene signatures'),
			...sortByI(signature, 'label').map(value => menuItem({value}, value.label))]).flat());

/*
 * cell type score selector & subselector
 */

var probOpts = state =>
	state.labelTransferProb[datasetCohort(state)]
		.map(type => menuItem({value: type}, type.label));

var probCellOpts = prob =>
	get(prob, 'field', []).map(c => menuItem({value: c}, c));

var probCellValue = state => state.colorBy.field.field || '';


/*
 * signature score mode
 */

var sigOpts = state =>
	sortByI(state.signatureScore[datasetCohort(state)], 'label')
		.map(value => menuItem({value}, value.label));

/*
 * Other options. In multi mode (Y chart axis) mix in labelTransferProb and
 * signatureScore fields.
 */

var otherItems = ({host, name, fields}) =>
	sortByI(fields, x => x).map(field =>
		menuItem({value: {host, name, field, type: 'float'}}, field));

var sigOptsOther = state =>
	flatmap(state.signatureScorePanel[datasetCohort(state)],
		({host, name, field: fields, label}) =>
			[listSubheader(label), ...otherItems({host, name, fields})]);

var probOptsOther = state =>
	flatmap(state.labelTransferProb[datasetCohort(state)],
		({host, name, field: fields, label}) =>
			[listSubheader(label), ...otherItems({host, name, fields})]);

// should probably generalize this & use it for all the selectors
var otherValue = (state, opts) =>
	Let((field = pick(state.colorBy.field, 'host', 'name', 'field'),
			vals = opts.map(opt => getIn(opt, ['props', 'value']))) =>
		find(vals, field) || '');

// drop scores into 'other' when in 'multi' mode.
var scoreOpts = (state, {type, multi} = {}) =>
	!multi || type === 'coded' ? [] :
	probOptsOther(state).concat(sigOptsOther(state));

// XXX Use label
var otherOpts = (state, pred) =>
	sortByI(filter(state.other[datasetCohort(state)], omit(pred, 'multi')), 'field')
		.map(value => menuItem({value}, value.field)).concat(scoreOpts(state, pred));

/*
 * default phenotype opts that are hoisted to the mode selector.
 */

var phenoItem = ({label, ...opt}) =>
	menuItem({value: {mode: 'pheno', ...opt}}, label);

var phenoOpts = (state, {type} = {}) =>
	filter(state.defaultPhenotype[datasetCohort(state)] || [], type && {type})
		.map(phenoItem);

/*
 * signature score panel & cell type score panels that are hoisted
 * to the mode selector when multi is set (chart Y axis)
 */

var sigPanelItem = ({label, ...opt}) =>
	menuItem({value: {mode: 'sigPanel', ...opt}}, label);

var sigPanelOpts = (state, {type, multi} = {}) =>
	multi && type !== 'coded' ?
	state.signatureScorePanel[datasetCohort(state)]
		.map(sigPanelItem) : [];

var probPanelItem = ({label, ...opt}) =>
	menuItem({value: {mode: 'probPanel', ...opt}}, label);

var probPanelOpts = (state, {type, multi} = {}) =>
	multi && type !== 'coded' ?
	state.labelTransferProb[datasetCohort(state)]
		.map(probPanelItem) : [];

/*
 *
 */

var geneValue = state =>
	Let(({field, host, name} = state.colorBy.field,
			dataSubType = getDataSubType(state, host, name)) =>
		field ? {field, host, name, dataSubType} : null);

var geneSet = state => get(geneValue(state), 'field', []);

var setDataSubType = (state, datasets) =>
		datasets.map(({host, name}) => ({
			host,
			name,
			dataSubType: getDataSubType(state, host, name)}));

var pickDataset = (state, datasets) =>
	Let(({host, name, field = []} = getIn(state, ['colorBy', 'field'], {})) =>
		field.length ? filter(datasets, {host, name}) : datasets);

var hasDensity = state => getIn(state, ['colorBy', 'data', 'density'])
	&& !getIn(state, ['colorBy', 'data', 'codes']);
var getSteps = ({min, max}) => (max - min) / 200;

var log2p1 = v => Math.log2(v + 1),
	pow2m1 = v => Math.pow(2, v) - 1;

var isLog = scale => get(scale, 0, '').indexOf('log') !== -1;

var colorScale = state => getIn(state, ['colorBy', 'data', 'scale']);
var scaleValue = state => Let((scale = colorScale(state)) =>
	scale && scaleParams(scale));

var sliderLinearOpts = state =>
	Let(({scaleBounds, scaleDefaults} = state.colorBy.data) => ({
		value: scaleValue(state),
		marks: scaleDefaults.map(d => ({value: d, label: d.toPrecision(2)})),
		step: getSteps(state.colorBy.data.scaleBounds),
		...scaleBounds
	}));

var sliderLogOpts = state =>
	Let(({scaleBounds, scaleDefaults} = state.colorBy.data,
		bounds = mapObject(scaleBounds, log2p1)) => ({
		value: scaleValue(state).map(log2p1),
		marks: scaleDefaults.map(d => ({value: log2p1(d), label: d.toPrecision(2)})),
		step: getSteps(bounds),
		...bounds,
		scale: pow2m1
	}));

var sliderScaleOpts = state =>
	(isLog(colorScale(state)) ? sliderLogOpts : sliderLinearOpts)(state);

var labelFormat = v => v.toPrecision(2);
var sliderOpts = (state, onScale) => ({
	onChange: onScale,
	valueLabelDisplay: 'auto',
	valueLabelFormat: labelFormat,
	...sliderScaleOpts(state)
});

var isFloat = (state, method) => get(method(state), 'type') === 'float';

var logTransformBounds = ({min, max}, log) =>
	log ? {min: log2p1(min), max: log2p1(max)} : {min, max};

var distribution = ({colorBy: {data}}) =>
	Let(({density: dist, scaleBounds, scale} = data,
			maxy = max(dist.map(([, y]) => y)), // XXX put in selector
			{min: minx, max: maxx} = logTransformBounds(scaleBounds, isLog(scale))) =>
		densityPlot({dist, viewBox: `${minx} 0 ${maxx - minx} ${maxy}`}));

var emptyDist = state =>
	Let(({min: [min], max: [max]} =
		getIn(state, ['colorBy', 'data', 'avg'], {})) => min === max);

var distributionSlider = (state, onScale) =>
	div({className: styles.distributionSlider},
		...(!emptyDist(state) ? [distribution(state)] : []),
		slider(sliderOpts(state, onScale)));

//var inc = Let((i = 0) => () => i++);

var modeOptions = {
	'': () => null,
	datasource: () => null,
	donor: () => null,
	pheno: ({state, onScale}) => isFloat(state, phenoValue) && hasDensity(state) ?
		distributionSlider(state, onScale) : null,
	sigPanel: () => null,
	probPanel: () => null,
	type: ({state, onCellType: onChange}) =>
		fragment(xSelect({
				id: 'celltype',
				label: 'Select a cell types/clusters',
				value: cellTypeValue(state), onChange
			}, ...cellTypeOpts(state))),
	other: ({state, pred, onOther: onChange, onScale}) =>
		Let((opts = otherOpts(state, pred), value = otherValue(state, opts)) =>
			fragment(xSelect({
					id: 'other',
					label: 'Select a phenotype',
					value, onChange
				}, ...opts),
				get(value, 'type') === 'float' && hasDensity(state) ?
					distributionSlider(state, onScale) : null)),
	prob: ({state, onProb, onProbCell, onScale}) =>
		Let((prob = probValue(state)) =>
			fragment(xSelect({
						id: 'prob',
						label: 'Select cell type/cluster scoring method',
						value: prob,
						onChange: onProb
					}, ...probOpts(state)),
				xSelect({
						id: 'prob-cell',
						label: 'Select a cell type/cluster score',
						value: probCellValue(state),
						onChange: onProbCell
					}, ...probCellOpts(prob)),
				hasDensity(state) ? distributionSlider(state, onScale) : null)),
	sig: ({state, onSig, onScale}) =>
		fragment(xSelect({
					id: 'sig-cell',
					label: 'Select a gene signature',
					value: sigValue(state),
					onChange: onSig
				}, ...sigOpts(state)),
			hasDensity(state) ? distributionSlider(state, onScale) : null),
	gene: ({state, onGene, onScale}) =>
		fragment(
			geneDatasetSuggest({label: 'Gene name', datasets:
				setDataSubType(state, hasGene(state, datasetCohort(state))),
				onSelect: onGene, value: geneValue(state)}),
			hasDensity(state) ? distributionSlider(state, onScale) :
				null),
	geneSet: ({state, onGeneSet, onDelete}) =>
		fragment(
			label('Search:'),
			geneDatasetSuggest({label: 'Gene name',
				datasets: pickDataset(state,
					setDataSubType(state, hasGene(state, datasetCohort(state)))),
				onSelect: onGeneSet, key: geneSet(state).join(',')}),
			geneSet(state).map((field, i) =>
				chip({onDelete: onDelete(i), key: i, color:
					'secondary', variant: 'outlined', size: 'small', label: field})))
};

var modeLabel = {
	datasource: 'Dataset',
	donor: 'Donor',
	type: 'Cell types/clusters',
	prob: 'Cell type/cluster scores',
	sig: 'Gene signature scores',
	gene: 'Gene/protein',
	geneSet: 'Gene/protein',
	'': 'None',
	other: 'More options'
};
var modeOpt = mode => menuItem({value: {mode}}, modeLabel[mode]);

var modeValue = state => getIn(state, ['colorBy', 'field']) || {mode: ''};
var defaultLabel = 'Select how to color cells by';

var modeOpts = (state, pred) =>
	Let((m = availModes(state, pred), i = m.length - (last(m) === 'other' ? 1 : 0)) =>
		insert(m.map(modeOpt), i,
		       concat(phenoOpts(state, pred), sigPanelOpts(state, pred),
		              probPanelOpts(state, pred))));

var isMatch = (obj, attrs) =>
	every(keys(attrs), key => isEqual(obj[key], attrs[key]));

class MapColor extends PureComponent {
	constructor(props) {
		super();
		this.state = {colorBy: getIn(props.state, ['colorBy', 'field'])};
		this.handlers = pick(this, (v, k) => k.startsWith('on'));
	}
	onColorBy = ev => {
		var {state} = this.props,
			colorBy = get(state.colorBy, 'field'),
			{value} = ev.target,
			{mode} = value,
			[[host, name] = [], field, type] =
				mode === 'donor' ? [hasDonor(state), '_DONOR'] :
				mode === 'datasource' ? [hasDatasource(state), '_DATASOURCE'] :
				mode === 'sigPanel' ? [[value.host, value.name], value.field] :
				mode === 'probPanel' ? [[value.host, value.name], value.field] :
				mode === 'pheno' ?
			        [[value.host, value.name], value.field, value.type] :
			    [],
			// Re-populate form if user selects the active mode
			newState = !contains(['pheno', 'sigPanel', 'probPanel'], mode) &&
				mode === get(colorBy, 'mode') ? colorBy :
				{mode, host, name, field, type};
		this.setState({colorBy: newState});
		if (field || !mode) {
			this.props.handlers.onColorBy(newState);
		}
	}
	onGene = ({host, name, field}) => {
		var {state} = this.props,
			{colnormalization, unit} = getIn(state, ['datasetMetadata', host, name]),
			newState = {mode: 'gene', host, name, field, colnormalization, unit};

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onGeneSet = ({host, name, field: newField}) => {
		var {state} = this.props,
			{colnormalization, unit} = getIn(state, ['datasetMetadata', host, name]),
			field = (this.state.colorBy.field || []).concat([newField]),
			newState = {mode: 'geneSet', host, name, field, colnormalization, unit};

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onDelete = i => () => {
		var field = splice(this.state.colorBy.field, i, 1),
			newState = assoc(this.state.colorBy, 'field', field);

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onCellType = ev => {
		var type = ev.target.value,
			{host, name, field} = type,
			newState = {mode: 'type', host, name, field};

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onOther = ev => {
		var other = ev.target.value,
			{host, name, field, type} = other,
			newState = {mode: 'other', host, name, field, type};

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onProb = ev => {
		var {host, name} = ev.target.value;
		this.setState({colorBy: {mode: 'prob', host, name, field: null}});
	}
	onProbCell = ev => {
		var {colorBy} = this.state,
			field = ev.target.value,
			newState = assoc(colorBy, 'field', field);

		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onSig = ev => {
		var {host, name, field} = ev.target.value,
			newState = {mode: 'sig', host, name, field};
		this.setState({colorBy: newState});
		this.props.handlers.onColorBy(newState);
	}
	onScale = (ev, params) => {
		var {state} = this.props;
		params = isLog(colorScale(state)) ? params.map(pow2m1) : params;

		if (/MuiSlider-markLabel/.exec(ev.target.className)) {
			// Click on mark label: set slider to mark.
			var {index} = ev.target.dataset,
				{scaleDefaults} = this.props.state.colorBy.data;

			params = assoc(scaleValue(state), index, scaleDefaults[index]);
		}
		this.props.handlers.onScale(ev, params);
	}
	render() {
		var {state: {colorBy}, handlers: {onColorBy, onScale, ...handlers}} = this,
			{state: appState, fieldPred, none = true,
			                     label = defaultLabel} = this.props,
			// overlay local state, for local control of the form
			state = assocIn(appState, ['colorBy', 'field'], colorBy),
			noneOpt = none ? [modeOpt('')] : [],
			opts = [...noneOpt, ...modeOpts(state, fieldPred)],
			mv = modeValue(state);
		return fragment(xSelect({
					id: 'color-mode',
					label,
					value: find(pluck(opts, ['props', 'value']), v => isMatch(mv, v)) || '',
					onChange: onColorBy
			}, ...opts),
			modeOptions[modeValue(state).mode]({state, pred: fieldPred, onScale,
			                                    ...handlers}));
	}
}

export default el(MapColor);
