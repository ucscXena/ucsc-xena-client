var {assocIn, getIn, Let, memoize1} = require('../underscore_ext').default;
import {cellTypeValue, colorByMode, datasetCohort, getSamples, getDataSubType,
	hasColor, phenoValue, probValue, otherValue} from '../models/singlecell';
import {colorScale} from '../colorScales';
import {computeChart, highchartView} from '../chart/highchartView';
import styles from './singlecellChart.module.css';
import PureComponent from '../PureComponent';
var {applyExpression} = require('../chart/singleCell');

import {el, div} from '../chart/react-hyper';

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
	axisTitleMode[colorByMode(getIn(state, [axis, 'data'])) || null]
		(assocIn(state, ['colorBy', 'field'], getIn(state, [axis, 'data', 'field'])));

var chartSubtitle = (cohort, cohortSamples) =>
	 `cohort: ${cohort} (n=${cohortSamples.length})`;

var LetIf = (v, f) => v && f(v);

function computedProps(props) {
	var {ydata, yexpression} = props,
		xcolor = LetIf(props.xcolor, colorScale),
		ycolor = colorScale(props.ycolor),
		ynonexpressed = applyExpression(ydata, yexpression),
		{chartData/*, stats*/} = computeChart({...props, xcolor, ycolor,
			ynonexpressed});
	return {...props, chartData, ycolor, xcolor};
}

function chartPropsFromState(state) {
	var ydata = getIn(state, ['chartY', 'data', 'req', 'values']),
		yexpression = 'singleCell';

	return {
		cohortSamples: getSamples(state),
		subtitle: chartSubtitle(datasetCohort(state), getSamples(state)),
		chartType: getIn(state, ['chartState', 'chartType'], 'dot'),

		ycodemap: getIn(state, ['chartY', 'data', 'codes']),
		ydata,
		ycolor: getIn(state, ['chartY', 'data', 'scale']),
		yfields: [getIn(state, ['chartY', 'data', 'field', 'field'])],
		ylabel: axisTitle(state, 'chartY'),
		yexpression,
		ynorm: 'none',

		xcodemap: getIn(state, ['chartX', 'data', 'codes']),
		xdata: getIn(state, ['chartX', 'data', 'req', 'values']),
		xcolor: getIn(state, ['chartX', 'data', 'scale']),
		xfield: getIn(state, ['chartX', 'data', 'field', 'field']),
		xlabel: axisTitle(state, 'chartX')
	};
}

export default el(class extends PureComponent {
	constructor() {
		super();
		this.computedProps = memoize1(computedProps);
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
			var props = chartPropsFromState(state),
				drawProps = this.computedProps(props);
			content = highchartView({drawProps});
		}

		return div({className: styles.container}, content);
	}
});
