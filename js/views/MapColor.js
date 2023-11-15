import PureComponent from '../PureComponent';
var {Fragment} = require('react');
var {assoc, assocIn, get, getIn, identity, Let, pick} = require('../underscore_ext').default;
import {Slider, ListSubheader, MenuItem} from '@material-ui/core';
import {el} from '../chart/react-hyper';
import {cellTypeValue, datasetCohort, getDataSubType, hasCellType, hasDataset, hasDatasource, hasDonor, hasGene, hasOther, hasTransferProb, otherValue, probValue} from '../models/map';
import geneDatasetSuggest from './GeneDatasetSuggest';
import xSelect from './xSelect';

var menuItem = el(MenuItem);
var slider = el(Slider);
var listSubheader = el(ListSubheader);
var fragment = el(Fragment);

var modes = ['datasource', 'donor', 'type', 'prob', 'gene', 'other'];

var alwaysFalse = () => false;

var hasMode = {
	datasource: hasDatasource,
	donor: hasDonor,
	type: hasCellType,
	prob: hasTransferProb,
	gene: hasGene,
	other: hasOther
};

var availModes = state => !hasDataset(state) ? [] :
	modes.filter(mode => (hasMode[mode] || alwaysFalse)(state));

var ident = a => a.map(identity);

// cell type and transferred label options
var cellTypeOpts = state =>
	Let((cohort = datasetCohort(state),
			{cellType: {[cohort]: cellType},
			 labelTransfer: {[cohort]: labelTransfer}} = state) => ident([
		cellType.length && [listSubheader('Cell types / clusters'),
			...cellType.map(value => menuItem({value}, value.label))],
		labelTransfer.length && [listSubheader('Transferred cell types / clusters'),
			...labelTransfer.map(value => menuItem({value}, value.label))]]).flat());

// XXX Use label
var otherOpts = state => state.other[datasetCohort(state)]
	.map(value => menuItem({value}, value.field));

var probOpts = state =>
	state.labelTransferProb[datasetCohort(state)]
		.map(type => menuItem({value: type}, type.label));

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

var colorData = state => getIn(state, ['colorBy', 'data', 'req', 'values', 0]);
var getSteps = ({min, max}) => (max - min) / 200;

var labelFormat = v => v.toPrecision(2);
var sliderOpts = (state, scale, onScale) => ({
	value: scale,
	onChange: onScale,
	// Our scales can go beyond the min/max of the data if the mean is biased
	// toward one bound.
	...state.colorBy.data.scaleBounds,
	step: getSteps(state.colorBy.data.scaleBounds),
	valueLabelDisplay: 'auto',
	valueLabelFormat: labelFormat
});

var isFloat = state => get(otherValue(state), 'type') === 'float';

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
	other: ({state, onOther: onChange, scale, onScale}) =>
		fragment(xSelect({
				id: 'other',
				label: 'Select a phenotype',
				value: otherValue(state), onChange
			}, ...otherOpts(state)),
			isFloat(state) && colorData(state) ?
				slider(sliderOpts(state, scale, onScale)) : null),
	prob: ({state, scale, onProb, onProbCell, onScale}) =>
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
				colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
					null)),
	gene: ({state, onGene, scale, onScale}) =>
		fragment(
			geneDatasetSuggest({label: 'Gene name', datasets:
				setDataSubType(state, hasGene(state, datasetCohort(state))),
				onSelect: onGene, value: geneValue(state)}),
			colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
				null)
};

var modeLabel = {
	datasource: 'Dataset',
	donor: 'Donor',
	type: 'Cell types/clusters',
	prob: 'Cell type/cluster scores',
	gene: 'Gene',
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
			newState = mode === colorBy.mode ? colorBy : {mode, host, name, field};
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
	render() {
		var {state: {colorBy}, handlers: {onColorBy, ...handlers}} = this,
			{scale, handlers: {onScale}, state: appState} = this.props,
			// overlay local state, for local control of the form
			state = assocIn(appState, ['colorBy', 'field'], colorBy);
		return fragment(xSelect({
					id: 'color-mode',
					label: 'Select how to color cells by',
					value: modeValue(state),
					onChange: onColorBy
				}, modeOpt(''), ...availModes(state).map(modeOpt)),
			modeOptions[modeValue(state)]({state, scale, onScale, ...handlers}));
	}
}

export default el(MapColor);
