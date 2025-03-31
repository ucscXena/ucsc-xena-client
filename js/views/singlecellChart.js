var {assoc, get, getIn, Let} = require('../underscore_ext').default;
import {cellTypeValue, datasetCohort, getSamples, getDataSubType, phenoValue,
	probValue, otherValue} from '../models/map';
import {colorScale} from '../colorScales';
import {computeChart, highchartView} from '../chart/highchartView';
import styles from './singlecellChart.module.css';

import {div} from '../chart/react-hyper';


var colorByMode = state => getIn(state, ['field', 'mode']);

// XXX duplicated in SingleCell.js
// Note colorBy is hard-coded into cellTypeValue, etc.
var axisTitleMode = {
	datasource: () => 'Data source',
	donor: () => 'Donor',
	type: state => cellTypeValue(state).label,
	prob: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({field} = state.colorBy.field) =>
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
	axisTitleMode[colorByMode(get(state, axis)) || null]
		(assoc(state, 'colorBy', state.chartY));

var chartSubtitle = (cohort, cohortSamples) =>
	 `cohort: ${cohort} (n=${cohortSamples.length})`;

function chartPropsFromState(state) {
	var ylabel = getIn(state, ['chartY', 'data', 'field', 'field']); //XXX move to ob
	var drawProps = {
		cohortSamples: getSamples(state),
		subtitle: chartSubtitle(datasetCohort(state), getSamples(state)),
		ycodemap: getIn(state, ['chartY', 'data', 'codes']),
		ydata: getIn(state, ['chartY', 'data', 'req', 'values']),
		ycolor: colorScale(getIn(state, ['chartY', 'data', 'scale'])),
		yfields: [ylabel],
		xlabel: '',
		ylabel: axisTitle(state, 'chartY')
	};

	return {drawProps, ...computeChart(drawProps)};
}

export default props => {
	var content;
	if (!getIn(props.state, ['chartY', 'data', 'req']) ||
		!getSamples(props.state)) {
		// XXX improve this.
		content = 'Loading...';
	} else {
		var {drawProps, chartData} = chartPropsFromState(props.state);
		content = highchartView({drawProps: {...drawProps, chartData}});
	}

	return div({className: styles.container}, content);
};
