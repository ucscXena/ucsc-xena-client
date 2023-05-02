var {Fragment} = require('react');
var {getIn, identity, isEqual, Let} = require('../underscore_ext').default;
import {Slider, ListSubheader, MenuItem} from '@material-ui/core';
import {div, el} from '../chart/react-hyper';
import {datasetCohort, hasDataset, hasDatasource, hasDonor, hasGene} from '../models/map';
import geneDatasetSuggest from './GeneDatasetSuggest';
import xSelect from './xSelect';

var menuItem = el(MenuItem);
var slider = el(Slider);
var listSubheader = el(ListSubheader);
var fragment = el(Fragment);

var modes = ['dataset', 'donor', 'type', 'prob', 'gene'];

var alwaysFalse = () => false;

// XXX do hasDataset before calling these & remove the check from these methods
var hasMode = {
	dataset: state => hasDataset(state) &&
		hasDatasource(state, datasetCohort(state)),
	donor: state => hasDataset(state) &&
		hasDonor(state, datasetCohort(state)),
	// cellType: {[cohort]: []}
	type: state => hasDataset(state) &&
		(state.cellType.length || state.labelTransfer.length),
	prob: state => hasDataset(state) &&
		state.labelTransferProb.length,
	gene: state => hasDataset(state) &&
		hasGene(state, datasetCohort(state))
};

var availModes = state => modes.filter(mode => (hasMode[mode] || alwaysFalse)(state));

var tfLabels = state => state.labelTransfer;

var ident = a => a.map(identity);

var cellTypes = state => state.cellType;

// cell type and transferred label options
var cellTypeOpts = state =>
	Let((types = cellTypes(state), labels = tfLabels(state)) => ident([
		types.length && [listSubheader('Cell types / clusters'),
			...cellTypes(state).map(type => menuItem({value: type}, type.label))],
		labels.length && [listSubheader('Transferred cell types / clusters'),
			...tfLabels(state).map(type => menuItem({value: type}, type.label))]]).flat());

var probOpts = state =>
	state.labelTransferProb.map(type => menuItem({value: type}, type.label));

var probCellOpts = state =>
	getIn(state.colorBy, ['prob', 'category'], [])
		.map(c => menuItem({value: c}, c));

// select component requires reference equality, so we have to find
// the matching option here.
//var cellTypeValue = (types, value) => types.find(t => isEqual(t, value)) || '';
var cellTypeValue = state => cellTypes(state).concat(tfLabels(state))
	.find(t => isEqual(t, state.colorBy.cellType)) || '';

var probValue = state => state.labelTransferProb
	.find(t => isEqual(t, state.colorBy.prob)) || '';

var probCellValue = state => state.colorBy.probCell || '';

var getDataSubType = ({datasetMetadata}, datasets) =>
		datasets.map(({host, name}) => ({
			host,
			name,
			dataSubType: getIn(datasetMetadata, [host, name, 'dataSubType'])}));

var colorData = state => getIn(state, ['colorBy', 'field', 'req', 'values', 0]);
var getSteps = ({min, max}) => (max - min) / 200;

var labelFormat = v => v.toPrecision(2);
var sliderOpts = (state, scale, onScale) => ({
	value: scale,
	onChange: onScale,
	// Our scales can go beyond the min/max of the data if the mean is biased
	// toward one bound.
	...state.colorBy.scaleBounds,
	step: getSteps(state.colorBy.scaleBounds),
	valueLabelDisplay: 'auto',
	valueLabelFormat: labelFormat
});

var modeOptions = {
	'': () => null,
	dataset: () => null,
	donor: () => null,
	type: ({state, onCellType: onChange}) =>
		div(xSelect({
				id: 'celltype',
				label: 'Select a cell type / cluster',
				value: cellTypeValue(state), onChange
			}, ...cellTypeOpts(state))),
	prob: ({state, scale, onProb, onProbCell, onScale}) =>
		fragment(xSelect({
					id: 'prob',
					label: 'Select a transferred cell type / cluster',
					value: probValue(state),
					onChange: onProb
				}, ...probOpts(state)),
			xSelect({
					id: 'prob-cell',
					label: 'Select cell type',
					value: probCellValue(state),
					onChange: onProbCell
				}, ...probCellOpts(state)),
			colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
				null),
	gene: ({state, onGene, scale, onScale}) =>
		div(
			geneDatasetSuggest({label: 'Gene name', datasets:
				getDataSubType(state, hasGene(state, datasetCohort(state))),
				onSelect: onGene, value: state.colorBy.gene}),
			colorData(state) ? slider(sliderOpts(state, scale, onScale)) :
				null)
};

var modeLabel = {
	dataset: 'By dataset',
	donor: 'By donor',
	type: 'By cell type/cluster',
	prob: 'By cell type/cluster probability',
	gene: 'By gene'
};
var modeOpt = mode => menuItem({value: mode}, modeLabel[mode]);

var modeValue = state => getIn(state, ['colorBy', 'mode'], '');

export default ({handlers: {onColorBy, ...handlers}, scale, state}) =>
	fragment(xSelect({
				id: 'color-mode',
				label: 'Select how to color cells',
				value: modeValue(state),
				onChange: onColorBy
			}, ...availModes(state).map(modeOpt)),
		modeOptions[modeValue(state)]({state, scale, ...handlers}));
