import PureComponent from '../PureComponent';
import { RGBToHex } from '../color_helper.js';
import * as _ from '../underscore_ext.js';
import gaEvents from '../gaEvents.js';
import multi from '../multi';
import {suitableColumns, columnLabel, v} from './utils.js';
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Card,
	FormControl,
	Icon,
	IconButton,
	TextField,
	Typography
} from '@material-ui/core';
import {div, el, fragment, label, textNode} from './react-hyper';
import * as colorScales from '../colorScales';
import classNames from 'classnames';
import { applyExpression } from './singleCell.js';
import { reOrderFields } from '../models/denseMatrix.js';
import {computeChart, highchartView, isCodedVCoded, isFloatVCoded, isSummary,
	summaryMode} from './highchartView';
import {selectProps, getOpt, buildDropdown, chartTypeControl, normalizationOptions,
	normalizationControl, yExpressionControl, expressionMode} from './chartControls';
import applyTransforms from './applyTransforms';
import statsView from './statsView';

// Styles
import compStyles from "./chart.module.css";

var accordionDetails = el(AccordionDetails);
var box = el(Box);
var button = el(Button);
var icon = el(Icon);
var iconButton = el(IconButton);
var card = el(Card);
var formControl = el(FormControl);
var textField = el(TextField);
var typography = el(Typography);

var sxAccordion = {
	'&.MuiAccordion-root + .MuiAccordion-root:before': {
		display: 'block', // persist border between accordions
	},
	'&.Mui-expanded': {
		margin: 0,
		'&::before': {
			opacity: 1,
		},
		'& .MuiCollapse-entered': {
			height: '100% !important',
			overflow: 'auto',
			overscrollBehavior: 'contain',
		},
	},
};

var sxAccordionSummary = {
	'&.Mui-expanded': {
		margin: 0,
		minHeight: 0,
		'.MuiAccordionSummary-content': {
			margin: 0,
		},
	},
	'& .MuiAccordionSummary-content': {
		margin: 0,
	},
	'& .MuiAccordionSummary-expandIcon': {
		padding: 0,
	},
};

var pctRange = {
	'3 stdev': ['sd03_', 'sd03'],
	'2 stdev': ['sd02_', 'sd02'],
	'1 stdev': ['sd01_', 'sd01'],
	'1st and 99th': ['p01', 'p99'],
	'5th and 95th': ['p05', 'p95'],
	'10th and 90th': ['p10', 'p90'],
	'25th and 75th': ['p25', 'p75'],
	'33rd and 66th': ['p33', 'p66'],
};

var avgOptions = [
	{label: 'none', value: 0},
	{label: 'mean', value: 1},
	{label: 'median', value: 2}
];

var pctOptions = [
	{label: 'none', value: 0},
	{label: '3 stdev', value: 1},
	{label: '2 stdev', value: 2},
	{label: '1 stdev', value: 3},
	{label: '1st and 99th', value: 4},
	{label: '5th and 95th', value: 5},
	{label: '10th and 90th', value: 6},
	{label: '25th and 75th', value: 7},
	{label: '33rd and 66th', value: 8},
];

var filterAvgOptions = (avgOptions, yavg) => avgOptions.filter(({label}) => label === 'none' || label in yavg);
var filterPctOptions = (pctOptions, yavg) => pctOptions.filter(({label}) => label === 'none' || pctRange[label].some(pctRange => pctRange in yavg));

var isFloat = (columns, id) => v(id) && !columns[id].codes;
var bigMulti = (columns, id) => columns[id].fields.length > 10;

// disable x float vs y with many subcolumns.
var disableMismatch = (columns, x, y, opt) =>
	isFloat(columns, x) && bigMulti(columns, y) ? _.assoc(opt, 'disabled', true) : opt;

var disableXMismatch = ({chartState: {ycolumn}, columns}) => opt =>
	disableMismatch(columns, opt.value, ycolumn, opt);

var disableYMismatch = ({chartState: {xcolumn}, columns}) => opt =>
	disableMismatch(columns, xcolumn, opt.value, opt);

var axisSettings = {
	Yaxis: {
		prop: 'ycolumn',
		label: 'Y axis',
		options: state => suitableColumns(state, true).map(disableYMismatch(state))
	},
	Xaxis: {
		prop: 'xcolumn',
		label: 'X axis',
		options: state => suitableColumns(state, false).map(disableXMismatch(state))
			.concat([{value: 'none', label: 'Histogram/Distribution'}])
	},
	Color: {
		prop: 'colorColumn',
		label: 'Color',
		options: state => [{value: 'none', label: 'None'}]
			.concat(suitableColumns(state, false))
	}
};

function axisSelector(xenaState, selectorID, onChange) {
	var {prop, label: text, options} = axisSettings[selectorID],
		storedColumn = _.get(xenaState.chartState, prop),
		axisOpts = options(xenaState),
		value = storedColumn || 'none';

	return formControl({className: compStyles.chartAction},
		label(textNode(text)),
		textField({
		onChange,
		value,
		...selectProps},
		...axisOpts.map(getOpt)));
}

function colUnit(colSettings) {
	if (!colSettings.units) {
		return "";
	}
	return colSettings.units.join();
}

var hasUnits = c => _.filter(c.units, _.identity).length !== 0;
var logScale = c => !_.any(c.units, unit => !unit || unit.search(/log/i) === -1);
var removeLogUnit = c => _.get(/\(([^)]+)\)/.exec(colUnit(c)), 1, '');
var someNegative = data => _.min(_.getIn(data, ['avg', 'min'])) < 0;

var expOptions = (column, data)  =>
	!(column && column.units) ? [] :
	logScale(column) ? [
		{value: 'none', label: colUnit(column)},
		{value: 'exp2', label: removeLogUnit(column)}] :
	[{value: 'none', label: hasUnits(column) ? colUnit(column) : 'unknown'},
		someNegative(data) || !hasUnits(column) ? {disabled: true, label: ''} :
		{value: 'log2', label: `log2(${colUnit(column)}+1)`}];

// box or dot or violin
var isBoxplot = state => isFloatVCoded(state) || isSummary(state) &&
		summaryMode(state) === 'boxplot';
var isDensityPlot = state => isSummary(state) && summaryMode(state) === 'density';
var isFloatVFloat = ({xcodemap, xfield}) => !xcodemap && xfield;
var doScatterColor = state => isFloatVFloat(state) && state.yfields.length === 1;

var getDenseValues = ({columns, data}, id) =>
	_.getIn(reOrderFields(columns[id], data[id]).data, ['req', 'values']);

var getColumnValues = multi(({columns}, id) => v(id) && columns[id].valueType);
getColumnValues.add('float', getDenseValues);
getColumnValues.add('coded', getDenseValues);
getColumnValues.add('segmented', ({data}, id) => _.getIn(data[id], ['avg', 'geneValues']));
getColumnValues.add('undefined', () => undefined);

var mapSD = (mean, sd, factor) => mean.map((m, index) => m + factor * sd[index]);

function addSDs({mean, sd, ...yavg}) {
	return {
		mean,
		sd,
		sd01_: mapSD(mean, sd, -1),
		sd01: mapSD(mean, sd, 1),
		sd02_: mapSD(mean, sd, -2),
		sd02: mapSD(mean, sd, 2),
		sd03_: mapSD(mean, sd, -3),
		sd03: mapSD(mean, sd, 3),
		...yavg,
	};
}

function axisLabel({columns, columnOrder}, id, showUnits, exp, norm) {
	if (!v(id)) {
		return '';
	}
	var label = columnLabel(columnOrder.indexOf(id), columns[id]),
		unit = showUnits ? '<br>Unit: ' + exp.label : '',
		noralization = norm === 'subset' ? '<br>mean-centered' :
			norm === 'subset_stdev' ? '<br>z-tranformed' : '';
	return label + unit + noralization;
}

// select metrics from state
var selectedMetrics = ({avgState, pctState, ycolumn}, yavg) =>
	_.pick(yavg,
		_.get(avgOptions[avgState[ycolumn]], 'label'),
		...(pctRange[_.get(pctOptions[pctState[ycolumn]], 'label')] || []));

var closeButton = onClose =>
	iconButton({className: compStyles.chartViewButton, onClick: onClose}, icon('close'));

// wrap handlers to add gaEvents
var gaSwap = fn => () => {
	gaEvents('chart', 'swapAxes');
	fn();
};

var gaChartType = fn => (v) => {
	gaEvents('chart', `toggle${v.replace(/^./, (char) => char.toUpperCase())}`);
	fn();
};

var gaAnother = fn => () => {
	gaEvents('chart', 'another');
	fn();
};

var isSegmented = (data, colorColumn) =>
	_.getIn(data, [colorColumn, 'req', 'rows']);

function scatterProps({data, columns}, params) {
	var {colorColumn} = params;
	if (!(doScatterColor(params) && v(colorColumn))) {
		return {};
	}

	var scale, sdata;

	if (isSegmented(data, colorColumn)) {
		let color = _.getIn(columns, [colorColumn, 'color']);
		let s = colorScales.colorScale(color),
			[,,,, origin] = color;

		// see km.js:segmentedVals(). This is a work-around for
		// trend-amplitude scales. We should deprecate them.
		scale = v => RGBToHex(...(v < origin ? s.lookup(0, origin - v) : s.lookup(1, v - origin)));
		sdata = _.getIn(data, [colorColumn, 'avg', 'geneValues', 0]);
	} else {
		let color = _.getIn(columns, [colorColumn, 'colors', 0]);
		scale = color && colorScales.colorScale(color);
		sdata = _.getIn(data, [colorColumn, 'req', 'values', 0]);
	}
	var codemap = _.getIn(columns, [colorColumn, 'codes']);
	var label = _.getIn(columns, [colorColumn, 'user', 'fieldLabel']);

	return {scatterColor: {scale, data: sdata, codemap, label}};
}

var firstColorScale = column =>
	_.Let((color = _.getIn(column, ['colors', 0])) =>
		color && colorScales.colorScale(color));

var chartSubtitle = ({cohort, cohortSamples}) =>
	 `cohort: ${_.get(cohort, 'name')} (n=${cohortSamples.length})`;

function xParamsFromState({columns, columnOrder, data, chartState}, column) {
	var xcodemap = _.get(columns[column], 'codes'),
		xcolor = firstColorScale(columns[column]),
		xdata = getColumnValues({columns, data}, column),
		xexpOpts = expOptions(columns[column], data[column]),
		xexp = xexpOpts[chartState.expState[column]],

		xfield = _.getIn(columns[column], ['fields', 0]),
		xlabel = axisLabel({columns, columnOrder}, column, !xcodemap, xexp);
	return {xcodemap, xcolor, xdata, xexpOpts, xexp, xfield, xlabel};
}

function yParamsFromState({columns, columnOrder, data, chartState}, column) {
	var ycodemap = _.get(columns[column], 'codes'),
		ycolor = firstColorScale(columns[column]),
		ydata = getColumnValues({columns, data}, column),
		yexpOpts = expOptions(columns[column], data[column]),
		yexp = yexpOpts[chartState.expState[column]],

		ynorm = !ycodemap && _.get(normalizationOptions[
				chartState.normalizationState[column]], 'value'),

		yfields = columns[column].probes || columns[column].fieldList
			|| columns[column].fields,
		ylabel = axisLabel({columns, columnOrder}, column, !ycodemap, yexp, ynorm),

		yneg = someNegative(data[column]),
		// 'singleCell' expression mode only for dot plots with positive values
		yexpression = expressionMode(chartState, yneg);
	return {ycodemap, ycolor, ydata, yexpOpts, yexp, ynorm, yfields, ylabel, yneg,
		yexpression};
}

function chartPropsFromState(xenaState) {
	var {chartState, cohort, cohortSamples, samplesMatched} = xenaState,
		{xcolumn, ycolumn, colorColumn, inverted, chartType} = chartState,

		// Using this destructuring pattern to remove things from xParams
		// that we need locally but not in drawProps. Things we need both
		// places are destructured on the next line.
		{xexpOpts, xexp, xdata, ...xParams} = xParamsFromState(xenaState, xcolumn),
		{xfield, xcodemap} = xParams,

		{yexpOpts, yexp, ydata, yneg, ...yParams} =
			yParamsFromState(xenaState, ycolumn),
		{yfields, ynorm, yexpression} = yParams,

		{yavg, ...transformedData} =
			applyTransforms(ydata, yexp, ynorm, xdata, xexp);

	var drawProps = {
		subtitle: chartSubtitle({cohort, cohortSamples}),
		cohortSamples, samplesMatched, chartType, inverted,
		...xParams,
		...yParams,
		yavg: selectedMetrics(chartState, addSDs(yavg)),
		ynonexpressed: applyExpression(ydata, yexpression),
		...transformedData,
		...scatterProps(xenaState, {xfield, xcodemap, yfields, colorColumn})
	};

	return {drawProps, xexpOpts, yexpOpts, yneg, yavg, ...computeChart(drawProps)};
}

class Chart extends PureComponent {
	constructor() {
		super();
		this.state = {advanced: false};
		this.chartPropsFromState = _.memoize1(chartPropsFromState);
	}

	onClose = () => {
		gaEvents('spreadsheet', 'columnChart-close');
		this.props.callback(['heatmap']);
	};

	render() {
		var {callback, appState: xenaState} = this.props,
			{advanced} = this.state,
			{chartState} = xenaState,
			set = (...args) => {
				var cs = _.assocIn(chartState, ...args);
				callback(['chart-set-state', cs]);
			};

		var {xcolumn, ycolumn, inverted, chartType} = chartState;

		var {drawProps, chartData, xexpOpts, yavg,
				yexpOpts, yneg, stats} = this.chartPropsFromState(xenaState),
			{xcodemap, xfield, ycodemap} = drawProps;

		var HCV = highchartView({drawProps: {...drawProps, chartData}});

		var isDot = isBoxplot(drawProps) && _.get(chartState, 'chartType') === 'dot',
			isDensity = isDensityPlot(drawProps),
			doScatter = doScatterColor(drawProps),
			doAvg = isDensity && 'mean' in yavg && 'median' in yavg,
			doPct = isDensity && 'mean' in yavg && 'sd' in yavg;

		var colorAxisDiv = doScatter ? axisSelector(xenaState, 'Color',
				ev => set(['colorColumn'], ev.target.value)) : null;
		var swapAxes = isCodedVCoded(drawProps) || doScatter ?
			button({color: 'secondary', disableElevation: true,
				onClick: gaSwap(() => set(['ycolumn'], xcolumn, ['xcolumn'],
					ycolumn)), variant: 'contained'}, 'Swap X and Y') : null;
		var invertAxes = isDot ? button({color: 'secondary', disableElevation: true,
				onClick: () => set(['inverted'], !inverted), variant: 'contained'},
				'Swap X and Y') : null;

		var yExpression = yneg || !isDot ? null :
			yExpressionControl({
				index: chartState.expressionState[ycolumn],
				onChange: i => set(['expressionState', chartState.ycolumn], i)});

		var yExp = ycodemap ? null :
			buildDropdown({
				opts: yexpOpts,
				index: chartState.expState[ycolumn],
				label: isDot ? 'Continuous data unit' :
					isDensity ? 'Data unit' :
					'Y unit',
				onChange: i => set(['expState', ycolumn], i)});

		var xExp = !v(xcolumn) || xcodemap ? null :
			buildDropdown({
				opts: xexpOpts,
				index: chartState.expState[xcolumn],
				label: 'X unit',
				onChange: i => set(['expState', chartState.xcolumn], i)});

		var normalization = ycodemap ? null :
			normalizationControl({
				isDot, isDensity,
				index: chartState.normalizationState[ycolumn],
				onChange: i => set(['normalizationState', chartState.ycolumn], i)
			});

		var switchView = isBoxplot(drawProps) ?
			chartTypeControl({
				onChange: (_, v) => gaChartType(() => set(['chartType'], v))(v),
				chartType, hasDot: !!xfield}) : null;

		var avgOpts = filterAvgOptions(avgOptions, yavg),
		avg = doAvg ?
			buildDropdown({
				disabled: avgOpts.length === 1,
				label: 'Show mean or median',
				onChange: (_, v) => set(['avgState', chartState.ycolumn], v),
				opts: avgOpts,
				value: chartState.avgState[ycolumn]}) : null;

		var pctOpts = filterPctOptions(pctOptions, yavg),
		pct = doPct ?
			buildDropdown({
				disabled: pctOpts.length === 1,
				label: 'Percentile shown',
				onChange: (_, v) => set(['pctState', chartState.ycolumn], v),
				opts: pctOpts,
				value: chartState.pctState[ycolumn]}) : null;

		var onAdvanced = () => this.setState({advanced: !advanced});

		var advOpt = fragment(box(
			{className: compStyles.chartActionsSecondary, component: Accordion, expanded: advanced, onChange: onAdvanced, square: true, sx: sxAccordion},
			box({className: compStyles.chartActionsSecondarySummary, component: AccordionSummary, expandIcon: icon({color: 'secondary'}, 'expand_more'), sx: sxAccordionSummary},
				typography({color: 'secondary', component: 'span', variant: 'inherit'}, `${advanced ? 'Hide' : 'Show'} Advanced Options`)),
			accordionDetails({className: compStyles.chartActionsSecondaryDetails}, yExp, normalization, xExp)));

		var chartStats = fragment(box(
			{className: compStyles.chartActionsSecondary, component: Accordion,
				square: true, sx: {...sxAccordion,
					display: `${stats ? 'block' : 'none'} !important`}},
			box({className: compStyles.chartActionsSecondarySummary, component:
				AccordionSummary, expandIcon: icon({color: 'secondary'},
					'expand_more'), sx: sxAccordionSummary}, typography({color:
						'secondary', component: 'span', variant: 'inherit'},
						'Statistics')),
			accordionDetails({className: compStyles.chartActionsSecondaryDetails},
				statsView({stats}))));

		return box({className: compStyles.chartView, id: 'chartView'},
				card({className: compStyles.card},
					div({className: compStyles.chartRender},
						closeButton(this.onClose), HCV)),
				card({className: classNames(compStyles.card, compStyles.chartActions)},
					div({className: compStyles.chartActionsPrimary},
						div({className: compStyles.chartActionsButtons},
							button({color: 'secondary', disableElevation: true,
								onClick: gaAnother(() => set(['another'], true)),
								variant: 'contained'},
								'Make another graph'),
							swapAxes, invertAxes, switchView, yExpression),
						avg, pct, colorAxisDiv && colorAxisDiv),
					yExp && advOpt, chartStats));
	};
}

var chart = el(Chart);

// pick what we need to reduce re-renders
export default ({appState, ...rest}) =>
	chart({appState: _.pick(appState, 'columns', 'data', 'columnOrder',
	                        'cohortSamples', 'cohort', 'samplesMatched', 'chartState'),
		   ...rest});
