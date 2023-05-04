import PureComponent from '../PureComponent';
var {Fragment} = require('react');
var {assoc, assocIn, get, getIn, identity, Let, pick} = require('../underscore_ext').default;
import {Slider, ListSubheader, MenuItem} from '@material-ui/core';
import {div, el} from '../chart/react-hyper';
import {cellTypeValue, datasetCohort, getDataSubType, hasCellType, hasDataset, hasDatasource, hasDonor, hasGene, hasTransferProb, probValue} from '../models/map';
import geneDatasetSuggest from './GeneDatasetSuggest';
import xSelect from './xSelect';

var menuItem = el(MenuItem);
var slider = el(Slider);
var listSubheader = el(ListSubheader);
var fragment = el(Fragment);

var modes = ['datasource', 'donor', 'type', 'prob', 'gene'];

var alwaysFalse = () => false;

var hasMode = {
	datasource: hasDatasource,
	donor: hasDonor,
	type: hasCellType,
	prob: hasTransferProb,
	gene: hasGene
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

var modeOptions = {
	'': () => null,
	datasource: () => null,
	donor: () => null,
	type: ({state, onCellType: onChange}) =>
		div(xSelect({
				id: 'celltype',
				label: 'Select a cell type / cluster',
				value: cellTypeValue(state), onChange
			}, ...cellTypeOpts(state))),
	prob: ({state, scale, onProb, onProbCell, onScale}) =>
		Let((prob = probValue(state)) =>
			fragment(xSelect({
						id: 'prob',
						label: 'Select a transferred cell type / cluster',
						value: prob,
						onChange: onProb
					}, ...probOpts(state)),
				xSelect({
						id: 'prob-cell',
						label: 'Select cell type',
						value: probCellValue(state),
						onChange: onProbCell
					}, ...probCellOpts(prob)),
				colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
					null)),
	gene: ({state, onGene, scale, onScale}) =>
		div(
			geneDatasetSuggest({label: 'Gene name', datasets:
				setDataSubType(state, hasGene(state, datasetCohort(state))),
				onSelect: onGene, value: geneValue(state)}),
			colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
				null)
};

var modeLabel = {
	datasource: 'By dataset',
	donor: 'By donor',
	type: 'By cell type/cluster',
	prob: 'By cell type/cluster probability',
	gene: 'By gene'
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
			mode = ev.target.value,
			[[host, name] = [], field] =
				mode === 'donor' ? [hasDonor(state), '_DONOR'] :
				mode === 'datasource' ? [hasDatasource(state), '_DATASOURCE'] :
			[],
			newState = {mode, host, name, field};
		this.setState({colorBy: newState});
		if (field) {
			this.props.handlers.onColorBy(newState);
		}
	}
	onGene = ({host, name, field}) => {
		var {state} = this.props,
			{colnormalization} = getIn(state, ['datasetMetadata', host, name]),
			newState = {mode: 'gene', host, name, field, colnormalization};

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
					label: 'Select how to color cells',
					value: modeValue(state),
					onChange: onColorBy
				}, ...availModes(state).map(modeOpt)),
			modeOptions[modeValue(state)]({state, scale, onScale, ...handlers}));
	}
}

export default el(MapColor);
