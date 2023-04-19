var {getIn, isEqual, Let} = require('../underscore_ext').default;
import {Select, Slider, MenuItem} from '@material-ui/core';
import {div, el, p} from '../chart/react-hyper';
import {datasetCohort, hasDataset, hasDatasource, hasDonor, hasGene} from '../models/map';
import geneDatasetSuggest from './GeneDatasetSuggest';

var select = el(Select);
var menuItem = el(MenuItem);
var slider = el(Slider);

var modes = ['dataset', 'donor', 'type', 'prob', 'gene'];

var alwaysFalse = () => false;

var hasMode = {
	dataset: ({singlecell}) => hasDataset(singlecell) &&
		hasDatasource(singlecell, datasetCohort(singlecell)),
	donor: ({singlecell}) => hasDataset(singlecell) &&
		hasDonor(singlecell, datasetCohort(singlecell)),
	// cellType: {[cohort]: []}
	type: ({singlecell}) => hasDataset(singlecell) && singlecell.cellType[datasetCohort(singlecell)].length,
	prop: alwaysFalse,
	gene: ({singlecell}) => hasDataset(singlecell) &&
		hasGene(singlecell, datasetCohort(singlecell))
};

var availModes = state => modes.filter(mode => (hasMode[mode] || alwaysFalse)(state));

var cellTypes = state => state.cellType[datasetCohort(state)];
var cellTypeOpts = types => types.map(type => menuItem({value: type}, type.assay));

// select component requires reference equality, so we have to find
// the matching option here.
var cellTypeValue = (types, value) => types.find(t => isEqual(t, value)) || '';

var getDataSubType = ({datasetMetadata}, datasets) =>
		datasets.map(({host, name}) => ({
			host,
			name,
			dataSubType: getIn(datasetMetadata, [host, name, 'dataSubType'])}));

var colorData = state => getIn(state, ['colorBy', 'field', 'req', 'values', 0]);
var getSteps = ({min, max}) => (max - min) / 200;

var sliderOpts = (state, scale, onScale) => ({
	value: scale,
	onChange: onScale,
	// Our scales can go beyond the min/max of the data if the mean is biased
	// toward one bound.
	...state.colorBy.scaleBounds,
	step: getSteps(state.colorBy.scaleBounds)
});

var modeOptions = {
	'': () => null,
	dataset: () => null,
	donor: () => null,
	type: ({state: {singlecell}, onCellType: onChange}) =>
		Let((types = cellTypes(singlecell)) =>
			div(p('Select a cell type / cluster'),
				select({value: cellTypeValue(types, singlecell.colorBy.cellType), onChange},
					cellTypeOpts(types)))),
	gene: ({state: {singlecell}, gene, onGene, scale, onScale}) =>
		div(
			geneDatasetSuggest({label: 'Gene name', datasets:
				getDataSubType(singlecell, hasGene(singlecell, datasetCohort(singlecell))),
				onSelect: onGene, value: gene}),
			colorData(singlecell) ? slider(sliderOpts(singlecell, scale, onScale)) : null
		)
};
// state
// 	{
//    colorBy: {
// 	    mode: ['donor', 'type', 'prop', 'gene'] | undefined,
// 	    donor: {field}
// 	    type: {feature},
// 	    prob: {feature, type, high, low}
// 	    gene: {dataset, gene, high, low}
//    }
// 	}

var modeLabel = {
	dataset: 'By dataset',
	donor: 'By donor',
	type: 'By cell type/cluster',
	prob: 'By cell type/cluster probability',
	gene: 'By gene'
};
var modeOpt = mode => menuItem({value: mode}, modeLabel[mode]);

var modeValue = state => getIn(state, ['singlecell', 'colorBy', 'mode'], '');

export default ({onColorBy, state, gene, onGene, scale, onScale, onCellType}) =>
	div(
		p('Select how to color cells'),
		select({value: modeValue(state), onChange: onColorBy},
			availModes(state).map(modeOpt)),
		modeOptions[modeValue(state)]({state, gene, onGene, scale, onScale, onCellType})
	);
