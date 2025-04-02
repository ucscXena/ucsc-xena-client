var {assocIn, getIn, Let, memoize1, pick} = require('../underscore_ext').default;
import {cellTypeValue, colorByMode, datasetCohort, getSamples, getDataSubType,
	hasColor, phenoValue, probValue, otherValue} from '../models/singlecell';
import {colorScale} from '../colorScales';
import {computeChart, highchartView} from '../chart/highchartView';
import styles from './singlecellChart.module.css';
import PureComponent from '../PureComponent';

import {el, div} from '../chart/react-hyper';

// XXX duplicated in SingleCell.js
// Note colorBy is hard-coded into cellTypeValue, etc.
var axisTitleMode = {
	datasource: () => 'Data source',
	donor: () => 'Donor',
	type: state => cellTypeValue(state).label,
	prob: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({field} = state.colorBy.data.field) =>
			`${probValue(state).label}: ${field}`) : '',
	sig: state => getIn(state, ['colorBy', 'field', 'field'], ''),
	gene: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({host, name, field} = state.colorBy.field) =>
			`${field} - ${getDataSubType(state, host, name)}`) : '',
	other: state => otherValue(state).field,
	pheno: state => phenoValue(state).label,
	null: () => ''
};
var axisTitle = (state, axis) =>
	axisTitleMode[colorByMode(getIn(state, [axis, 'data'])) || null]
		(assocIn(state, ['colorBy', 'field'], getIn(state, [axis, 'data', 'field'])));

var chartSubtitle = (cohort, cohortSamples) =>
	 `cohort: ${cohort} (n=${cohortSamples.length})`;

var LetIf = (v, f) => v && f(v);

function chartPropsFromState(state) {
	var drawProps = {
		cohortSamples: getSamples(state),
		subtitle: chartSubtitle(datasetCohort(state), getSamples(state)),

		ycodemap: getIn(state, ['chartY', 'data', 'codes']),
		ydata: getIn(state, ['chartY', 'data', 'req', 'values']),
		ycolor: colorScale(getIn(state, ['chartY', 'data', 'scale'])),
		yfields: [getIn(state, ['chartY', 'data', 'field', 'field'])],
		ylabel: axisTitle(state, 'chartY'),

		xcodemap: getIn(state, ['chartX', 'data', 'codes']),
		xdata: getIn(state, ['chartX', 'data', 'req', 'values']),
		xcolor: LetIf(getIn(state, ['chartX', 'data', 'scale']), colorScale),
		xfield: getIn(state, ['chartX', 'data', 'field', 'field']),
		xlabel: axisTitle(state, 'chartX')
	};

	return {drawProps};
}

var singlecellChart = el(class extends PureComponent {
	constructor() {
		super();
		// XXX we are redrawing when changing an axis, with the old data.
		// This makes the UI freeze. Need to not redraw until the data
		// updates.
		this.computeChart = memoize1(computeChart);
	}
	render () {
		var content;
		var {state} = this.props;

		if (state.chartMode === 'compare' && !(hasColor(state.chartY) &&
				hasColor(state.chartX)) ||
			!hasColor(state.chartY)) {
			// XXX improve this.
			content = 'Loading...';
		} else {
			var {drawProps} = chartPropsFromState(state),
				{chartData} = this.computeChart(drawProps);
			content = highchartView({drawProps: {...drawProps, chartData}});
		}

		return div({className: styles.container}, content);
	}
});

export default ({state}) =>
	singlecellChart({state: pick(state, 'chartX', 'chartY', 'dataset', 'samples',
		'cellType', 'labelTransfer', 'signature', 'other', 'defaultPhenotype',
		'labelTransferProb', 'datasetMetadata')});
