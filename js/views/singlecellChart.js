var {assoc, assocIn, get, getIn, isArray, isEqual, Let} =
	require('../underscore_ext').default;
import {cellTypeValue, colorByMode, datasetCohort, expressionMode,
	getChartType, getDataSubType, getSamples, hasColor, isBoxplot, phenoValue,
	probValue, sigPanelValue, otherValue, probPanelValue} from '../models/singlecell';
import {colorScale} from '../colorScales';
import {computeChart, highchartView} from '../chart/highchartView';
import styles from './singlecellChart.module.css';
import PureComponent from '../PureComponent';
var {applyExpression} = require('../chart/singleCell');
import applyTransforms from '../chart/applyTransforms';
import spinner from '../ajax-loader.gif';
import {normalizationOptions} from '../chart/chartControls';

import {el, div, img} from '../chart/react-hyper';

// XXX duplicated in SingleCell.js
// Note colorBy is hard-coded into cellTypeValue, etc.
var axisTitleMode = {
	datasource: () => 'Data source',
	donor: () => 'Donor',
	type: state => cellTypeValue(state).label,
	prob: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({field} = state.colorBy.field) =>
			`${probValue(state).label}: ${field}`) : '',
	probPanel: state => probPanelValue(state).label,
	sig: state => getIn(state, ['colorBy', 'field', 'field'], ''),
	sigPanel: state => sigPanelValue(state).label,
	gene: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({host, name, field} = state.colorBy.field) =>
			`${field} - ${getDataSubType(state, host, name)}`) : '',
	geneSet: state => getIn(state, ['colorBy', 'field', 'field']) ?
		Let(({host, name, field} = state.colorBy.field) =>
			`${field.join(', ')} - ${getDataSubType(state, host, name)}`) : '',
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

var applyHidden = (xdata, hidden) =>
	hidden && hidden.length ?
		Let((h = new Set(hidden)) => [xdata[0].map(v => h.has(v) ? NaN : v)]) :
		xdata;

export function computedProps(props) {
	if (!props) {
		return;
	}
	var {yhidden, ydata: ydataAll, yexpression, ynorm, xhidden,
			xdata: xdataAll} = props,
		ydata = applyHidden(ydataAll, yhidden),
		xdata = applyHidden(xdataAll, xhidden),
		xcolor = LetIf(props.xcolor, colorScale),
		ycolor = colorScale(props.ycolor),
		ynonexpressed = applyExpression(ydata, yexpression),
		{yavg, ...transformedData} = applyTransforms(ydata, null, ynorm, xdata, null), //eslint-disable-line no-unused-vars

		computed = computeChart({...props, xcolor, ycolor, ynonexpressed,
			...transformedData});
	return {...props, ...computed, ycolor, xcolor, ...transformedData};
}

var ensureArray = x => isArray(x) ? x : [x];

var getNormalizationValue = state =>
	Let(({host, name} = getIn(state, ['chartY', 'data', 'field']),
		i = getIn(state, ['chartState', 'normalization', host, name], 0)) =>
			normalizationOptions[i].value);

// 'inverted' setting has two subtleties. For dot plot we don't invert
// axes because we can't plot coded v float. Instead we flop the chart by
// passing 'inverted' to the renderer. For other plots we invert the axes
// here.
// Additionally, for dot plot we default to inverted depending on cardinality
// of the two axes, so when the user selects inverted we may already be inverted.
// The desired inverted state is the default xor the user setting, as below.
var isInverted = state => getIn(state, ['chartState', 'inverted']);
var swapAxes = state =>
	state.chartMode !== 'dist' && !isBoxplot(state) && isInverted(state) ?
		assoc(state, 'chartY', get(state, 'chartX'), 'chartX', get(state, 'chartY')) :
		state;

var hasData = state => state.chartMode === 'dist' ?
	hasColor(state.chartY) :
	hasColor(state.chartY) && hasColor(state.chartX);

export function chartPropsFromState(state0) {
	if (!hasData(state0)) {
		return;
	}
	var state = swapAxes(state0),
		ydata = getIn(state, ['chartY', 'data', 'req', 'values']),
		xcodemap = getIn(state, ['chartX', 'data', 'codes']),
		inverted = ydata.length < get(xcodemap, 'length', 1),
		yexpression = expressionMode(state),
		ycodemap = getIn(state, ['chartY', 'data', 'codes']);

	return {
		cohortSamples: getSamples(state),
		subtitle: chartSubtitle(datasetCohort(state), getSamples(state)),
		chartType: getChartType(state),
		legend: false,
		inverted: !isInverted(state) !== !inverted, // xor with boolean cast

		ycodemap,
		ydata,
		ycolor: getIn(state, ['chartY', 'data', 'scale']),
		yfields: ensureArray(getIn(state, ['chartY', 'data', 'field', 'field'])),
		ylabel: axisTitle(state, 'chartY'),
		yexpression,
		ynorm: !ycodemap && getNormalizationValue(state),

		xcodemap,
		xdata: getIn(state, ['chartX', 'data', 'req', 'values']),
		xcolor: getIn(state, ['chartX', 'data', 'scale']),
		xfield: getIn(state, ['chartX', 'data', 'field', 'field']),
		xlabel: axisTitle(state, 'chartX'),
		xhidden: getIn(state, ['chartX', 'hidden']),
		yhidden: getIn(state, ['chartY', 'hidden'])
	};
}

var fieldMatchesData = (state, key) =>
	isEqual(getIn(state, [key, 'field']), getIn(state, [key, 'data', 'field']));

var dataLoaded = state =>
	state.chartMode === 'dist' ?
		fieldMatchesData(state, 'chartY') :
		fieldMatchesData(state, 'chartY') && fieldMatchesData(state, 'chartX');

export var singlecellChart = el(class extends PureComponent {
	constructor() {
		super();
	}
	render () {
		var content;
		var {state} = this.props;

		if (state.chartProps) {
			content = highchartView({drawProps: state.chartProps});
		}

		return div({id: 'chartView', className: styles.container}, content,
			div({className: styles.overlay,
			         style: {display: dataLoaded(state) ? 'none' : 'block'}},
				img({src: spinner})
			)
		);
	}
});
