import PureComponent from '../PureComponent';
var {Fragment} = require('react');
var {assoc, assocIn, filter, get, getIn, identity, Let, mapObject, max,
	pick} = require('../underscore_ext').default;
import {Slider, ListSubheader, MenuItem} from '@material-ui/core';
import {el, div} from '../chart/react-hyper';
import {cellTypeValue, datasetCohort, getDataSubType, hasCellType, hasDataset,
	hasDatasource, hasDonor, hasGene, hasOther, hasTransferProb, otherValue,
	probValue, hasSignatureScore, sigValue} from '../models/map';
import {scaleParams} from '../colorScales';
import geneDatasetSuggest from './GeneDatasetSuggest';
import xSelect from './xSelect';
import densityPlot from './densityPlot';
import styles from './MapColor.module.css';

var menuItem = el(MenuItem);
var slider = el(Slider);
var listSubheader = el(ListSubheader);
var fragment = el(Fragment);

var modes = ['datasource', 'donor', 'type', 'prob', 'sig', 'gene', 'other'];
var floatOnlyModes = ['prob', 'sig', 'gene', 'other'];

var alwaysFalse = () => false;

var hasMode = {
	datasource: hasDatasource,
	donor: hasDonor,
	type: hasCellType,
	prob: hasTransferProb,
	sig: hasSignatureScore,
	gene: hasGene,
	other: hasOther
};

var availModes = (state, floatOnly) => !hasDataset(state) ? [] :
	(floatOnly ? floatOnlyModes : modes)
		.filter(mode => (hasMode[mode] || alwaysFalse)(state));

var ident = a => a.map(identity);

// cell type and transferred label options
var cellTypeOpts = state =>
	Let((cohort = datasetCohort(state),
			{cellType: {[cohort]: cellType},
			 signature: {[cohort]: signature},
			 labelTransfer: {[cohort]: labelTransfer}} = state) => ident([
		cellType.length && [listSubheader('Cell types / clusters'),
			...cellType.map(value => menuItem({value}, value.label))],
		labelTransfer.length && [listSubheader('Transferred cell types / clusters'),
			...labelTransfer.map(value => menuItem({value}, value.label))],
		signature.length && [listSubheader('Cell types by gene signatures'),
			...signature.map(value => menuItem({value}, value.label))]]).flat());

var filterOther = (list, floatOnly) =>
	floatOnly ? filter(list, {type: 'float'}) : list;

// XXX Use label
var otherOpts = (state, floatOnly) =>
	filterOther(state.other[datasetCohort(state)], floatOnly)
		.map(value => menuItem({value}, value.field));

var probOpts = state =>
	state.labelTransferProb[datasetCohort(state)]
		.map(type => menuItem({value: type}, type.label));

var sigOpts = state =>
	state.signatureScore[datasetCohort(state)]
		.map(value => menuItem({value}, value.label));

var probCellOpts = prob =>
	get(prob, 'category', []).map(c => menuItem({value: c}, c));

var probCellValue = state => state.colorBy.field.field || '';

var geneValue = state =>
	Let(({field, host, name} = state.colorBy.field,
			dataSubType = getDataSubType(state, host, name)) =>
		field ? {field, host, name, dataSubType} : null);

var setDataSubType = (state, datasets) =>
		datasets.map(({host, name}) => ({
			host,
			name,
			dataSubType: getDataSubType(state, host, name)}));

var colorData = state => getIn(state, ['colorBy', 'data', 'req', 'values', 0])
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

var isFloat = state => get(otherValue(state), 'type') === 'float';

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

var modeOptions = {
	'': () => null,
	datasource: () => null,
	donor: () => null,
	type: ({state, onCellType: onChange}) =>
		fragment(xSelect({
				id: 'celltype',
				label: 'Select a cell types/clusters',
				value: cellTypeValue(state), onChange
			}, ...cellTypeOpts(state))),
	other: ({state, floatOnly, onOther: onChange, onScale}) =>
		fragment(xSelect({
				id: 'other',
				label: 'Select a phenotype',
				value: otherValue(state), onChange
			}, ...otherOpts(state, floatOnly)),
			isFloat(state) && colorData(state) ?
				distributionSlider(state, onScale) : null),
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
				colorData(state) ? distributionSlider(state, onScale) : null)),
	sig: ({state, onSig, onScale}) =>
		fragment(xSelect({
					id: 'sig-cell',
					label: 'Select a gene signature',
					value: sigValue(state),
					onChange: onSig
				}, ...sigOpts(state)),
			colorData(state) ? distributionSlider(state, onScale) : null),
	gene: ({state, onGene, onScale}) =>
		fragment(
			geneDatasetSuggest({label: 'Gene name', datasets:
				setDataSubType(state, hasGene(state, datasetCohort(state))),
				onSelect: onGene, value: geneValue(state)}),
			colorData(state) ? distributionSlider(state, onScale) :
				null)
};

var modeLabel = {
	datasource: 'Dataset',
	donor: 'Donor',
	type: 'Cell types/clusters',
	prob: 'Cell type/cluster scores',
	sig: 'Gene signature scores',
	gene: 'Gene/protein',
	'': 'None',
	other: 'More options'
};
var modeOpt = mode => menuItem({value: mode}, modeLabel[mode]);

var modeValue = state => getIn(state, ['colorBy', 'field', 'mode'], '');

class MapColor extends PureComponent {
	constructor(props) {
		super();
		this.state = {colorBy: getIn(props.state, ['colorBy', 'field'])};
		this.handlers = pick(this, (v, k) => k.startsWith('on'));
	}
	onColorBy = ev => {
		var {state} = this.props,
			{colorBy: {field: colorBy}} = state,
			mode = ev.target.value,
			[[host, name] = [], field] =
				mode === 'donor' ? [hasDonor(state), '_DONOR'] :
				mode === 'datasource' ? [hasDatasource(state), '_DATASOURCE'] :
			    [],
			// Re-populate form if user selects the active mode
			newState = mode === get(colorBy, 'mode') ? colorBy :
				{mode, host, name, field};
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
	onCellType = ev => {
		var type = ev.target.value,
			{host, name} = JSON.parse(type.dsID),
			{field} = type,
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
		var prob = ev.target.value,
			{host, name} = JSON.parse(prob.dsID);
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
		var sig = ev.target.value,
			{host, name} = JSON.parse(sig.dsID),
			{field} = sig,
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
			{state: appState, floatOnly} = this.props,
			// overlay local state, for local control of the form
			state = assocIn(appState, ['colorBy', 'field'], colorBy);
		return fragment(xSelect({
					id: 'color-mode',
					label: 'Select how to color cells by',
					value: modeValue(state),
					onChange: onColorBy
				}, modeOpt(''), ...availModes(state, floatOnly).map(modeOpt)),
			modeOptions[modeValue(state)]({state, floatOnly, onScale, ...handlers}));
	}
}

export default el(MapColor);
