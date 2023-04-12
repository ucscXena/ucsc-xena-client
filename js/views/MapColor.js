var {spy, getIn} = require('../underscore_ext').default;
import {Select, MenuItem} from '@material-ui/core';
import {div, el, p} from '../chart/react-hyper';
import {datasetCohort, hasDataset, hasDatasource, hasDonor, hasGene} from '../models/map';
import geneDatasetSuggest from './GeneDatasetSuggest';

var select = el(Select);
var menuItem = el(MenuItem);

var modes = ['dataset', 'donor', 'type', 'prob', 'gene'];

var alwaysFalse = () => false;

var hasMode = {
	dataset: ({singlecell}) => hasDataset(singlecell) &&
		hasDatasource(singlecell, datasetCohort(singlecell)),
	donor: ({singlecell}) => hasDataset(singlecell) &&
		hasDonor(singlecell, datasetCohort(singlecell)),
	type: alwaysFalse,
	prop: alwaysFalse,
	gene: ({singlecell}) => hasDataset(singlecell) &&
		hasGene(singlecell, datasetCohort(singlecell))
};

var availModes = state => modes.filter(mode => (hasMode[mode] || alwaysFalse)(state));

var clusterTypes = () => [];

var getDataSubType = ({datasetMetadata}, datasets) =>
		datasets.map(({host, name}) => ({
			host,
			name,
			dataSubType: getIn(datasetMetadata, [host, name, 'dataSubType'])}));

var modeOptions = {
	'': () => null,
	donor: () => null,
	type: state => div('Select a cell type / cluster',
		select(...clusterTypes(state))),
	gene: ({state: {singlecell}, gene, onGene}) =>
		geneDatasetSuggest({label: 'Gene name', datasets:
			getDataSubType(singlecell, hasGene(singlecell, datasetCohort(singlecell))),
			onSelect: onGene, value: spy('gene', gene)})
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

export default ({onColorBy, state, gene, onGene}) =>
	div(
		p('Select how to color cells'),
		select({value: modeValue(state), onChange: onColorBy},
			availModes(state).map(modeOpt)),
		modeOptions[modeValue(state)]({state, gene, onGene})
	);
