import PureComponent from '../PureComponent';
var {hexToRGB, colorStr, RGBToHex} = require ('../color_helper').default;
var Highcharts = require('highcharts/highstock');
require('highcharts/highcharts-more')(Highcharts);
var highchartsHelper =  require ('./highcharts_helper');
require('highcharts/modules/boost')(Highcharts);
require('highcharts/modules/heatmap')(Highcharts);
var _ = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
var jStat = require('../jStatShim');
var gaEvents = require('../gaEvents');
import multi from '../multi';
import {suitableColumns, columnLabel, v} from './utils.js';
import {
	Accordion,
	AccordionDetails,
	AccordionSummary,
	Box,
	Button,
	Card,
	CardContent,
	CardHeader,
	FormControl,
	Icon,
	IconButton,
	MenuItem,
	TextField,
	Typography
} from '@material-ui/core';
var sc = require('science');
import {div, el, fragment, label, textNode} from './react-hyper';
import classNames from 'classnames';
import {isSet, bitCount} from '../models/bitmap';
import {xenaColor} from '../xenaColor';
var {fastats} = require('../xenaWasm');
var {reOrderFields} = require('../models/denseMatrix');

var nrd = sc.stats.bandwidth.nrd;
var variance = sc.stats.variance;

export function kde() {
	var k = sc.stats.kde();
	k.bandwidth(function(x) {
		var bw = nrd(x);
		if (bw === 0) {
			bw = variance(x);
		}

		return bw;
	});
	return k;
}

// Styles
var compStyles = require('./chart.module.css');

var accordionDetails = el(AccordionDetails);
var box = el(Box);
var button = el(Button);
var icon = el(Icon);
var iconButton = el(IconButton);
var card = el(Card);
var cardContent = el(CardContent);
var cardHeader = el(CardHeader);
var formControl = el(FormControl);
var menuItem = el(MenuItem);
var textField = el(TextField);
var typography = el(Typography);

var defaultColor = xenaColor.BLUE_PRIMARY;

var selectProps = {
	className: compStyles.formControl,
	select: true,
	SelectProps: {
		MenuProps: {
			style: {width: 224},
		},
	},
	size: 'small',
	variant: 'outlined'
};

var sxAccordion = {
	'&.Mui-expanded': {
		margin: 0,
		'&::before': {
			opacity: 1,
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

// group field0 by code0, where field1 has value
function groupIndexWithValueByCode(field0, codes0, field1) {
	var indicies = _.range(field0.length).filter(i => !isNaN(field1[i]));
	var groups = _.groupBy(indicies, i => codes0[field0[i]]);
	delete groups[undefined];
	return groups;
}


// XXX We should really group by value, and covert values
// to codes late, but the current implementation uses
// codes early. See groupIndex.
function groupIndexByCode(field, codes) {
	var groups = _.groupBy(_.range(field.length), i => codes[field[i]]);
	delete groups[undefined];
	return groups;
}

function groupIndex(field) {
	var groups = _.groupBy(_.range(field.length), i => field[i]);
	delete groups.NaN;
	return groups;
}

var groupValues = (field, groups) =>
	groups.map(indices => indices.map(i => field[i]).filter(x => !isNaN(x)));

// utility function to calculate p value from a given coefficient using "Testing using Student's t-distribution" method
// spearman rank https://en.wikipedia.org/wiki/Spearman's_rank_correlation_coefficient#Determining_significance
// pearson correlation https://en.wikipedia.org/wiki/Pearson_correlation_coefficient#Testing_using_Student's_t-distribution
function pValueFromCoefficient(coeff, length) {
	var tScore = coeff * (Math.sqrt(length - 2) / Math.sqrt(1 - (coeff * coeff)));
	var pValue;

	if (isFinite(tScore)) { // If the value of tScore is Finite, then the pValue is calculated from the t Test
		pValue = jStat.ttest(tScore, length - 2, 2); //p value from t value with n-2 dof and 2 tails
	} else { // If the value of tScore is Infinite, then pValue is 0
		pValue = 0;
	}
	return(pValue);
}

//scatter plot stats Pearson's rho/r, Spearman rank rho/ρ value
function printPearsonAndSpearmanRho(div, xlabel, yfields, xVector, ydata) {
	[...Array(yfields.length).keys()].forEach(i => {
		var ylabel = yfields[i],
			yVector = ydata[i],
			[xlist, ylist] = _.unzip(_.filter(_.zip(xVector, yVector), function (x) {return !isNaN(x[0]) && !isNaN(x[1]);})),
			rho = jStat.corrcoeff(xlist, ylist), // r Pearson's Rho correlation coefficient
			spearmanRho = jStat.spearmancoeff(xlist, ylist), // (spearman's) rank correlation coefficient, rho
			pValueRho = pValueFromCoefficient(rho, ylist.length), // P value from pearson's rho value and length of ylist
			pValueSpearmanRho = pValueFromCoefficient(spearmanRho, ylist.length); // P value from spearman rho value and length of ylist

		if (div.innerHTML !== '') {
			div.innerHTML += '<br>'  + '<br>';
		}
		div.innerHTML = div.innerHTML +
			xlabel + ' ~ ' + ylabel + '<br>' +
			'Pearson\'s rho<br>' +
			'r = ' + rho.toPrecision(4) + '  ' +
			'(p = ' + pValueRho.toPrecision(4) + ')' + '<br>' +
			'Spearman\'s rank rho<br>' +
			'rho = ' + spearmanRho.toPrecision(4) + '  ' +
			'(p = ' + pValueSpearmanRho.toPrecision(4) + ')' + '<br>';
	});
}

// p value when there is only 2 group comparison student t-test
// https://en.wikipedia.org/wiki/Welch%27s_t-test
function welch({meanMatrix, stdMatrix, nNumberMatrix}, yfields) {
	var statsDiv = document.getElementById('stats');
	statsDiv.innerHTML = 'Welch\'s t-test<br>';
	_.range(yfields.length).map(k => {
		if (nNumberMatrix[0][k] > 1 && nNumberMatrix[1][k] > 1) {
			let yfield = yfields[k];
			// p value calculation using Welch's t-test
			let x1 = meanMatrix[0][k], // mean1
				x2 = meanMatrix[1][k], // mean2
				v1 = stdMatrix[0][k] * stdMatrix[0][k], //variance 1
				v2 = stdMatrix[1][k] * stdMatrix[1][k], //variance 2
				n1 = nNumberMatrix[0][k], // number 1
				n2 = nNumberMatrix[1][k], // number 2
				vCombined = v1 / n1 + v2 / n2, // pooled variance
				sCombined = Math.sqrt(vCombined), //pool sd
				tStatistics = (x1 - x2) / sCombined, // t statistics,
				dof = vCombined * vCombined / ((v1 / n1) * (v1 / n1) / (n1 - 1)
					+ (v2 / n2) * (v2 / n2) / (n2 - 1)), // degree of freedom
				cdf = jStat.studentt.cdf(tStatistics, dof),
				pValue = 2 * (cdf > 0.5 ? (1 - cdf) : cdf);

			statsDiv.innerHTML += (
				(yfields.length > 1 ? ('<br>' + yfield + '<br>') : '') +
				'p = ' + pValue.toPrecision(4) + ' ' +
				'(t = ' + tStatistics.toPrecision(4) + ')<br>'
			);
		}
	});
	statsDiv.classList.toggle(compStyles.visible);
}

// p value for >2 groups one-way ANOVA
// https://en.wikipedia.org/wiki/One-way_analysis_of_variance
function anova({matrices: {nNumberMatrix, meanMatrix, stdMatrix},
		yfields, ydata, groups}) {
	var statsDiv = document.getElementById('stats');
	statsDiv.innerHTML = 'One-way Anova<br>';
	_.range(yfields.length).map(k => {
		let yfield = yfields[k],
			ydataElement = ydata[k],
			ybinnedSample = groupValues(ydataElement, groups);

		let flattenArray = _.flatten(ybinnedSample),
			// Calculate the overall mean
			totalMean = flattenArray.reduce((sum, el) => sum + el, 0) / flattenArray.length,
			//Calculate the "between-group" sum of squared differences
			sB = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][0] > 0) {
					return sum + nNumberMatrix[index][k] * Math.pow((meanMatrix[index][k] - totalMean), 2);
				} else {
					return sum;
				}
			}, 0),
			// between-group degrees of freedom
			fB = _.range(groups.length).filter(index => nNumberMatrix[index][k] > 0).length - 1,
			// between-group mean square differences
			msB = sB / fB,
			// Calculate the "within-group" sum of squares
			sW = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][k] > 0) {
					return sum + Math.pow(stdMatrix[index][k], 2) * nNumberMatrix[index][k];
				} else {
					return sum;
				}
			}, 0),
			// within-group degrees of freedom
			fW = _.range(groups.length).reduce((sum, index) => {
				if (nNumberMatrix[index][k] > 0) {
					return sum + nNumberMatrix[index][k] - 1;
				} else {
					return sum;
				}
			}, 0),
			// within-group mean difference
			msW = sW / fW,
			//  F-ratio
			fScore = msB / msW,
			// p value
			pValue = jStat.ftest(fScore, fB, fW);

		statsDiv.innerHTML += (
			(yfields.length > 1 ? ('<br>' + yfield + '<br>') : '') +
			'p = ' + pValue.toPrecision(4) + ' ' +
			'(f = ' + fScore.toPrecision(4) + ')<br>'
		);
	});
	statsDiv.classList.toggle(compStyles.visible);
}

var getOpt = opt => menuItem({key: opt.value, dense: true, disabled: opt.disabled, value: opt.value}, opt.label);

var viewOptions = [
	{label: 'box plot', value: 'boxplot'},
	{label: 'violin plot', value: 'violin'},
	{label: 'dot plot', value: 'dot'}
];

var dataTypeOptions = [
	{label: 'bulk data', value: 'bulk'},
	{disabled: true, label: 'single cell data', value: 'singleCell'}
];

var filterViewOptions = (viewOptions, xfield) => xfield ? viewOptions : viewOptions.filter(({value}) => value !== 'dot');

var normalizationOptions = [{
		"value": "none",
		"label": "none",
	}, //no normalization
	{
		"value": "subset",
		"label": "subtract mean",
	}, //selected sample level current heatmap normalization
	{
		"value": "subset_stdev",
		"label": "subtract mean, divide stdev (z-score)",
	} //selected sample level current heatmap normalization
];

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

var dropdownOpt = (opts, value, index = 0) => (opts.find(({value: v}) => v === value) || opts[index]);

function buildDropdown({disabled = false, index = 0, label: text, onChange, opts, value}) {
	return formControl({className: compStyles.chartAction},
		label(textNode(text)),
		textField({
			disabled,
			onChange: ev => onChange(opts.findIndex(o => o.value === ev.target.value), ev.target.value),
			value: dropdownOpt(opts, value, index).value,
			...selectProps},
			...opts.map(getOpt)));
}

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
var someNegative = data => _.some(data, d => _.some(d, v => v < 0));

var expOptions = (column, data)  =>
	!(column && column.units) ? [] :
	logScale(column) ? [
		{value: 'none', label: colUnit(column)},
		{value: 'exp2', label: removeLogUnit(column)}] :
	[{value: 'none', label: hasUnits(column) ? colUnit(column) : 'unknown'},
		someNegative(data) || !hasUnits(column) ? {disabled: true, label: ''} :
		{value: 'log2', label: `log2(${colUnit(column)}+1)`}];

function newChart(opts) {
	return new Highcharts.Chart(opts);
}

function sizeChartView() {
	var chartViewEl = document.getElementById('chartView');
	var chartViewRect = chartViewEl.getBoundingClientRect();
	var height = window.innerHeight - chartViewRect.top;
	chartViewEl.style.setProperty('height', `${height}px`);
}

const LOWERWHISKER = 0;
const LOWER = 1;
const MEDIAN = 2;
const UPPER = 3;
const UPPERWHISKER = 4;
const BOXLEN = 5;

function boxplotPoint(data) {
	var m = data.length;
	data.sort((a, b) => a - b);

	// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
	var median = data[Math.floor( m / 2)],
		lower =  data[Math.floor( m / 4)],
		upper =  data[Math.floor( 3 * m / 4)],
		whisker = 1.5 * (upper - lower),
		upperwhisker = data[
			_.findIndexDefault(data, x => x > upper + whisker, data.length) - 1],
		lowerwhisker = data[
			_.findLastIndexDefault(data, x => x < lower - whisker, -1) + 1];

	// This must match BOX order
	return [lowerwhisker, lower, median, upper, upperwhisker];
}

// poor man's lazy seq
function* constantly (fn) {
	while (true) {
		yield fn();
	}
}

var nobox = new Array(BOXLEN).fill(NaN);

function initFVCMatrices({ydata, groups}) {
	// matrices, row is x and column is y:
	// mean
	// median
	// upper --  75 percentile
	// lower --  25 percentile
	// upperwhisker --  upperwhisker percentile
	// lowerwhisker --  lowerwhisker percentile
	// std
	// nNumber -- number of data points (real data points) for dataMatrix

	// init average matrix std matrix // row is x by column y
	var [meanMatrix, stdMatrix, nNumberMatrix] =
			constantly(() =>
				_.times(groups.length, () => new Array(ydata.length).fill(NaN))),
		boxes = _.times(groups.length, () => new Array(ydata.length));


	// Y data and fill in the matrix
	ydata.forEach((ydataElement, k) => {
		let ybinnedSample = groupValues(ydataElement, groups);

		// Note that xCategories has already been null filtered on x, so it's not
		// the same as xcodemap.
		ybinnedSample.forEach((data, i) => {
			let m = data.length;
			nNumberMatrix[i][k] = m;
			boxes[i][k] = m ? boxplotPoint(data) : nobox;
			if (m) {
				let average =  highchartsHelper.average(data);
				meanMatrix[i][k] = average;
				stdMatrix[i][k] = highchartsHelper.standardDeviation(data, average);
			}
		});
	});
	return {meanMatrix, boxes, stdMatrix, nNumberMatrix};
}

function sortMatrices(xCategories, groups, colors, matrices) {
	let {boxes} = matrices,
		sortedIndex = _.sortBy(
				_.range(boxes.length).filter(i => !isNaN(boxes[i][0][MEDIAN])),
				i => boxes[i][0][MEDIAN]),
			reorder = m => _.map(sortedIndex, i => m[i]);

	return [reorder(xCategories), reorder(groups), reorder(colors),
			   _.mapObject(matrices, m => reorder(m))];
}

function boxplot({xCategories, matrices, yfields, colors, chart}) {
	var {boxes, nNumberMatrix} = matrices;

	xCategories.forEach((code, i) => {
		// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
		var nNumberSeries = nNumberMatrix[i],
			color = colors[i],
			dataSeries = boxes[i];

		if (nNumberSeries[0]) {
			highchartsHelper.addSeriesToColumn({
				chart,
				type: 'boxplot',
				name: code,
				data: dataSeries,
				yIsCategorical: false,
				showDataLabel: yfields.length * xCategories.length < 30,
				showInLegend: code != null,
				color,
				description: nNumberSeries[0]});
		}
	});
}

function dotplot({ chart, colors, dataType, matrices: { meanMatrix, nNumberMatrix }, xCategories, yfields }) {
	// filter out NaN values from the meanMatrix, flatten it and calculate the min and max
	var meanValues = meanMatrix.flat().filter(m => !Number.isNaN(m)),
		minMean = Math.min(...meanValues),
		maxMean = Math.max(...meanValues),
		range = maxMean - minMean || 1;
	var {
		opacity: { max: maxOpacity = 1, min: minOpacity = 0.2 } = {},
		radius: { max: maxRadius = 10, min: minRadius = 2 } = {}
	} = chart.markerScale || {};
	// determine whether the data type is single cell.
	var isSingleCellData = dataType === 'singleCell';
	xCategories.forEach((category, categoryIndex) => {
		var nNumberSeries = nNumberMatrix[categoryIndex];
		highchartsHelper.addSeriesToColumn({
			chart,
			name: category,
			data: yfields.map((feature, featureIndex) => {
				var value = meanMatrix[categoryIndex][featureIndex],
					normalizedValue = (value - minMean) / range,
					opacity = normalizedValue * (maxOpacity - minOpacity) + minOpacity, // opacity between 0.2 and 1 (from colorAxis range).
					color = isSingleCellData ? colors[categoryIndex] : Highcharts.color(defaultColor).setOpacity(opacity).get(),
					radius = normalizedValue * (maxRadius - minRadius) + minRadius; // radius of dot scaled between 2 and 10px.
				return {
					color,
					custom: {n: nNumberSeries[0]},
					marker: {radius},
					value,
					x: featureIndex,
					y: categoryIndex,
				};
			}),
			showInLegend: false,
			type: 'scatter',
		});
	});
}

var violinSamples = 30;

function violinplot({xCategories, yfields, matrices: {boxes, nNumberMatrix},
		ydata, groups, chart, colors}) {

	// build kde and sample it
	var data = yfields.map((field, i) => {
		// XXX this duplicates the grouping done in initFVCMatrices. We need
		// the matricies to draw the iqr and whiskers.
		//
		// XXX this is also duplicated in the anova stats
		let ybinnedSample = groupValues(ydata[i], groups);

		return ybinnedSample.map(g => {
			// Only sample the region having data, for each group. Don't extend
			// to the global data range. This helps visually indicate the data range,
			// and reduces compute.
			var gmin = _.min(g),
				gmax = _.max(g),
				step = (gmax - gmin) / violinSamples,
				innerRange = _.times(violinSamples + 1, i => gmin + i * step);

			return kde().sample(g)(innerRange);
		});
	});

	// place groups across the x axis, and scale violin peak
	data = data.map((yfield, i) => {
		var offset = i * (groups.length + 1);
		return yfield.map((group, j) => {
			var y0 = offset + j;
			var upper = _.max(group.map(([, y]) => y));
			return group.map(([x, y]) => {
				// scale to fixed width. This prevents direct comparison
				// of two violins, but makes the shape more apparent. Without
				// this scaling, the graph width is essentially unbounded, since
				// a cluster of points will cause a very wide peak.
				var width = y / (upper * groups.length);
				return [x, y0 + width, y0 - width];
			});
		});
	}).flat();


	// here we're taking a flatted list of violin data. We align it with
	// boxplot data by some math. The flatted list is by mapping
	// yfields & x catageories.
	data.forEach((data, i) => {
		var cat = i % groups.length,
			code = xCategories[cat],
			field = Math.floor(i / groups.length),
			color = colors[cat],
			[lowerwhisker, lower, median, upper, upperwhisker] = boxes[cat][field],
			stats = {
				code,
				field: yfields[field],
				n: nNumberMatrix[cat][field],
				lowerwhisker,
				lower,
				median,
				upper,
				upperwhisker
			};
		// draw the body of the violin
		highchartsHelper.addSeriesToColumn({
			chart,
			type: 'areasplinerange',
			name: code, // for legend
			data,
			showDataLabel: yfields.length * groups.length < 30,
			showInLegend: code != null && i < groups.length,
			color,
			marker: {enabled: false},
			description: stats});
	});

	// here we iterate yfields & x catgories, and pull from boxplot data
	// for each. We use the x categories to project to the right offset.
	yfields.forEach((yfield, i) => {
		xCategories.forEach((code, j) => {
			var y = i * (groups.length + 1) + j;
			// draw the inner quartile range
			highchartsHelper.addSeriesToColumn({
				boost: {enabled: true},
				chart,
				type: 'line',
				color: 'black',
				lineWidth: 3,
				data: [[boxes[j][i][LOWER], y], [boxes[j][i][UPPER], y]]
			});
			// draw the whisker range
			highchartsHelper.addSeriesToColumn({
				chart,
				type: 'line',
				color: 'black',
				lineWidth: 1,
				data: [[boxes[j][i][LOWERWHISKER], y],
					[boxes[j][i][UPPERWHISKER], y]]
			});
		});
	});
	// here we again iterate y fields & x categories, and pull from the
	// boxplot data, flattening into a single series.
	var medians =
		yfields.flatMap((yfield, i) => groups.map((code, j) => {
			var y = i * (groups.length + 1) + j;
			return [boxes[j][i][MEDIAN], y] ;
		}));
	highchartsHelper.addSeriesToColumn({
				chart,
				type: 'scatter',
				marker: {
					symbol: 'circle',
					fillColor: 'white',
					radius: 1.5
				},
				data: medians});
}

var fvcOptions = chartType => ({
	boxplot: highchartsHelper.boxplotOptions,
	dot: highchartsHelper.dotOptions,
	violin: highchartsHelper.violinOptions
}[chartType]);

var fvcChart = chartType => ({
	boxplot,
	dot: dotplot,
	violin: violinplot
}[chartType]);

// It might make sense to split this into two functions instead of having
// two polymorphic calls in here, and not much else.
function boxOrDotOrViolin({groups, xCategories, chartType = 'boxplot', colors, dataType, inverted, setView, yfields, ydata,
		xlabel, ylabel, ynorm}, chartOptions) {
	setView(chartType);
	var matrices = initFVCMatrices({ydata, groups});

	// sort by median of xCategories if yfields.length === 1
	if (xCategories.length > 0 && yfields.length === 1) {
		[xCategories, groups, colors, matrices] = sortMatrices(xCategories, groups, colors, matrices);
	}

	chartOptions = fvcOptions(chartType)({chartOptions, inverted, series: xCategories.length,
		categories: yfields, xAxis: {categories: yfields}, xAxisTitle: xlabel, yAxis: {categories: xCategories}, yAxisTitle: ylabel, ynorm});

	var chart = newChart(chartOptions);

	fvcChart(chartType)({xCategories, dataType, groups, matrices, yfields, ydata, colors, chart});

	if (xCategories.length === 2) {
		welch(matrices, yfields);
	} else if (xCategories.length > 2) {
		anova({matrices, yfields, ydata, groups});
	}

	return chart;
}

// compute group sample indices, codes, and colors, then draw
// box, dot or violin plot.
function floatVCoded({xdata, xcodemap, xcolumn, columns, /*cohortSamples,
		samplesMatched, //commnet out see below */ ...params}, chartOptions) {

	var groupsByValue = groupIndex(xdata[0]),
		values = _.range(xcodemap.length).filter(v => groupsByValue[v]),
		xCategories = values.map(v => xcodemap[v]),
		groups = values.map(v => groupsByValue[v]);

	// comment out: advanced feature to highlight a category in box/violin plot if it is completely composed of highlight samples
	// the problem of this code is that if none of the categories is completely composed of highlight samples, all bars/violoin plots are gray
	/*
	var highlightValue = samplesMatched &&
				samplesMatched.length !== cohortSamples.length ?
		_.Let((matches = new Set(samplesMatched)) =>
			new Set(values.filter((v, i) => groups[i].every(s => matches.has(s))))) :
		null;

	var scale = highlightValue ?
		v => highlightValue.has(v) ? 'gold' : '#A9A9A9' :
		colorScales.colorScale(columns[xcolumn].colors[0]);
	*/

	var scale = colorScales.colorScale(columns[xcolumn].colors[0]);

	var colors = values.map(scale);

	return boxOrDotOrViolin({groups, xCategories, colors, ...params}, chartOptions);
}

function densityplot({yavg, yfields: [field], ylabel: Y, ydata: [data], setRange, setView}, chartOptions) {
	setView('density');
	chartOptions = highchartsHelper.densityChart({chartOptions, yavg, yaxis: field, Y});
	var nndata = _.filter(data, x => !isNaN(x)),
		min = _.min(nndata),
		max = _.max(nndata),
		points = 100, // number of points to interpolate, on screen
		density = kde().sample(nndata)
		(_.range(min, max, (max - min) / points));
	setRange({min, max});

	var chart = newChart(chartOptions);
	highchartsHelper.addSeriesToColumn({
		chart,
		color: defaultColor,
		type: 'areaspline',
		data: density,
		marker: {enabled: false}});
	return chart;
}

function summaryBoxplot(params, chartOptions) {
	var {cohortSamples} = params,
		groups = [_.range(0, cohortSamples.length)],
		colors = ['#0000FF80', 'blue'],
		xCategories = [null];
	return boxOrDotOrViolin({groups, colors, xCategories, ...params}, chartOptions);
}

function summaryColumn({ydata, ycodemap, xlabel, ylabel}, chartOptions) {
	var lengths = _.mapObject(groupIndexByCode(ydata[0], ycodemap), g => g.length),
		categories = ycodemap.filter(c => _.has(lengths, c)),
		total = _.sum(_.values(lengths)),
		nNumberSeries = categories.map(code => lengths[code]),
		dataSeries = nNumberSeries.map(len => len * 100 / total);

	chartOptions = highchartsHelper.columnChartOptions(chartOptions,
		categories.map(code => `${code} (${lengths[code]})`),
		xlabel, "Distribution", ylabel, false);

	var chart = newChart(chartOptions);

	highchartsHelper.addSeriesToColumn({
		chart,
		type: 'column',
		name: ' ',
		data: dataSeries,
		yIsCategorical: true,
		showDataLabel: categories.length < 30,
		showInLegend: false,
		color: defaultColor,
		description: nNumberSeries});
	return chart;
}

var summary = multi(({ycodemap, yfields}) =>
	ycodemap ? 'column' :
	yfields.length > 1 ? 'boxplot' :
	'density');

summary.add('column', summaryColumn);
summary.add('boxplot', summaryBoxplot);
summary.add('density', densityplot);

function codedVCoded({xcodemap, xdata, ycodemap, ydata, xlabel, ylabel,
		columns, ycolumn}, chartOptions) {

	var statsDiv = document.getElementById('stats'),
		showLegend,
		code,
		categories,
		i, k,
		pValue, dof,
		total, chart;

	// Y data: yfields can only have array size of 1
	var ybinnedSample = groupIndexByCode(ydata[0], ycodemap);

	var xbinnedSample = groupIndexWithValueByCode(xdata[0], xcodemap, ydata[0]);

	// column chart setup
	// XXX this order may be weird
	categories = _.keys(xbinnedSample);


	showLegend = true;

	chartOptions = highchartsHelper.columnChartOptions(
		chartOptions, categories.map(code => code + " (" + xbinnedSample[code].length + ")"),
		xlabel, 'Distribution', ylabel, showLegend);

	chart = newChart(chartOptions);

	// XXX this order may be weird
	var ycategories = Object.keys(ybinnedSample);

	//code
	let scale = colorScales.colorScale(columns[ycolumn].colors[0]),
		invCodeMap = _.invert(ycodemap);

	// Pearson's chi-squared test pearson https://en.wikipedia.org/wiki/Pearson's_chi-squared_test
	// note, another version of pearson's chi-squared test is G-test, Likelihood-ratio test, https://en.wikipedia.org/wiki/Likelihood-ratio_test
	var observed = [],
		expected = [],
		xRatio = [],
		xMargin = [],
		yMargin = [];

	total = 0.0;
	for (i = 0; i < ycategories.length; i++) {
		code = ycategories[i];
		observed.push(new Array(categories.length));
		expected.push(new Array(categories.length));
		yMargin.push(ybinnedSample[code].length);
		total += yMargin[i];
	}
	// fill expected matrix
	for (k = 0; k < categories.length; k++) {
		code = categories[k];
		xMargin.push(xbinnedSample[code].length);
		xRatio.push(xMargin[k] / total);
	}
	for (i = 0; i < ycategories.length; i++) {
		code = ycategories[i];
		var ybinnedSampleSet = new Set(ybinnedSample[code]);
		for (k = 0; k < categories.length; k++) {
			observed[i][k] = xbinnedSample[categories[k]].filter(x => ybinnedSampleSet.has(x)).length;
			expected[i][k] = xRatio[k] * yMargin[i];
		}
	}

	for (i = 0; i < ycategories.length; i++) {
		code = ycategories[i];
		var ycodeSeries = new Array(categories.length);
		for (k = 0; k < categories.length; k++) {
			if (xMargin[k] && observed[i][k]) {
				ycodeSeries[k] = parseFloat(((observed[i][k] / xMargin[k]) * 100).toPrecision(3));
			} else {
				ycodeSeries[k] = 0;
			}
		}

		highchartsHelper.addSeriesToColumn({
			chart,
			type: 'column',
			name: code,
			data: ycodeSeries,
			yIsCategorical: ycodemap,
			showDataLabel: ycodemap.length * categories.length < 30,
			showInLegend: showLegend,
			color: scale(invCodeMap[code]),
			description: observed[i]});
	}

	// pearson chi-square test statistics
	dof = (ycategories.length - 1) * (categories.length - 1);
	if (dof) {
		var chisquareStats = 0.0;

		for (i = 0; i < ycategories.length; i++) {
			for (k = 0; k < categories.length; k++) {
				chisquareStats += Math.pow((observed[i][k] - expected[i][k]), 2) / expected[i][k];
			}
		}

		pValue = 1 - jStat.chisquare.cdf( chisquareStats, dof);
		statsDiv.innerHTML = 'Pearson\'s chi-squared test<br>' +
				'p = ' + pValue.toPrecision(4) + ' ' +
				'(χ2 = ' + chisquareStats.toPrecision(4) + ')';
		statsDiv.classList.toggle(compStyles.visible);
	}

	return chart;
}

var nullStr = v => v !== v ? 'null' : v;

function floatVFloat({samplesLength, xfield, xdata,
		yfields, ydata,
		xlabel, ylabel,
		scatterColorScale, scatterColorData, scatterColorDataCodemap,
		samplesMatched,
		columns, colorColumn, cohortSamples}, chartOptions) {

	var statsDiv = document.getElementById('stats'),
		yfield,
		i, k,
		average, stdDev,
		chart;

	var sampleLabels = cohortSamples,
		x, y;

	chartOptions = highchartsHelper.scatterChart(chartOptions, xlabel, ylabel, samplesLength);

	if (yfields.length > 1) { // y multi-subcolumns -- only happen with genomic y data
		chart = newChart(chartOptions);

		for (k = 0; k < yfields.length; k++) {
			var series = [];

			yfield = yfields[k];
			for (i = 0; i < xdata[0].length; i++) {
				x = xdata[0][i];
				y = ydata[k][i];
				if (!isNaN(x) && !isNaN(y)) {
					series.push({
						name: sampleLabels[i],
						x: x,
						y: y
					});
				}

			}
			chart.addSeries({
				name: yfield,
				data: series
			}, false);
		}
	} else { // y single subcolumn  --- coloring with a 3rd column
		var multiSeries = {},
			colorScale, getCodedColor,
			highlightSeries = [],
			opacity = 0.6,
			colorCode, colorMin, color, colorLabel,
			customColors,
			useCodedSeries = scatterColorDataCodemap || !scatterColorData,
			gray = `rgba(150,150,150,${opacity})`,
			bin;

		getCodedColor = code => {
			if ("NaN" === code) {
				return gray;
			}
			return colorStr(hexToRGB(colorScales.categoryMore[code % colorScales.categoryMore.length], opacity));
		};

		if (!useCodedSeries) {
			average = highchartsHelper.average(scatterColorData);
			stdDev = highchartsHelper.standardDeviation(scatterColorData, average);
			colorMin = _.min(scatterColorData);
			bin = stdDev * 0.1;
			colorScale = v => isNaN(v) ? 'gray' : scatterColorScale(v);
		}

		chartOptions = _.deepMerge(chartOptions, {
			legend: {title: {text: ''}}
		});
		chart = newChart(chartOptions);

		yfield = yfields[0];
		for (i = 0; i < xdata[0].length; i++) {
			x = xdata[0][i];
			y = ydata[0][i];
			if (scatterColorData) {
				colorCode = scatterColorData[i];
			} else {
				colorCode = 0;
			}

			if (!isNaN(x) && !isNaN(y) && null != colorCode) {
				if (useCodedSeries) { // use multi-seriese
					if (!multiSeries[colorCode]) {
						multiSeries[colorCode] = {
							"data": []
						};
					}
					multiSeries[colorCode].data.push({
						colorLabel: scatterColorDataCodemap ?
							(scatterColorDataCodemap[colorCode] || "null (no data)") : '',
						name: sampleLabels[i],
						x: x,
						y: y
					});
				} else { // convert float to multi-seriese
					colorCode = Math.round((colorCode - colorMin) / bin) * bin + colorMin;
					if (!multiSeries[colorCode]) {
						multiSeries[colorCode] = {
							"data": []
						};
					}
					multiSeries[colorCode].data.push({
						colorLabel: nullStr(scatterColorData[i]),
						name: sampleLabels[i],
						x: x,
						y: y,
					});
				}

				if (samplesMatched && samplesLength !== bitCount(samplesMatched) &&
					isSet(samplesMatched, i)) {
					highlightSeries.push({
						name: sampleLabels[i],
						x: x,
						y: y
					});
				}
			}
		}

		if (v(colorColumn)) { // custome categorial color
			customColors = _.getIn(columns[v(colorColumn)], ['colors', 0, 2]);
		}

		_.keys(multiSeries).map( (colorCode, i) => {
			var showInLegend;
			if (scatterColorData) {
				if (useCodedSeries) {
					colorLabel = scatterColorDataCodemap[colorCode] || "null (no data)";
					color = customColors ? customColors[colorCode] : getCodedColor(colorCode);
					showInLegend = true;
				} else {
					color = colorScale(colorCode);
					colorLabel = columns[colorColumn].user.fieldLabel;
					showInLegend = (i === 0) ? true : false;
				}

			} else {
				color = defaultColor;
				colorLabel = "sample";
				showInLegend = true;
			}

			chart.addSeries({
				name: colorLabel,
				showInLegend: showInLegend,
				data: multiSeries[colorCode].data,
				color: color,
			}, false);
		});

		// add highlightSeries color in gold with black border
		if (highlightSeries.length > 0 ) {
			chart.addSeries({
				name: "highlighted samples",
				data: highlightSeries,
				marker: {
					symbol: 'circle',
					lineColor: 'black',
					fillColor: 'gold',
					lineWidth: 1,
				}
			}, false);
		}
	}

	// pearson rho value when there are <= 10 series x y scatter plot
	if (yfields.length <= 10 && xdata[0].length > 1) {
		if (xdata[0].length >= 5000) {
			var btn = document.createElement("BUTTON"); // need to refractor to react style, and material UI css
			statsDiv.appendChild(btn);
			btn.innerHTML = "Run Stats";
			btn.onclick = function() {
				printPearsonAndSpearmanRho(statsDiv, xfield, yfields, xdata[0], ydata);
				chart.reflow();
			};
		} else {
			printPearsonAndSpearmanRho(statsDiv, xfield, yfields, xdata[0], ydata);
		}

		statsDiv.classList.toggle(compStyles.visible);
	}

	return chart;
}

function drawChart(params) {
	var {cohort, samplesLength, xfield, xcodemap, ycodemap} = params,
		subtitle = `cohort: ${_.get(cohort, 'name')} (n=${samplesLength})`,
		chartOptions = _.assoc(highchartsHelper.chartOptions,
			'subtitle', {text: subtitle}),
		statsDiv = document.getElementById('stats');

	statsDiv.innerHTML = "";
	statsDiv.classList.toggle(compStyles.visible, false);

	if (xcodemap && !ycodemap) {
		return floatVCoded(params, chartOptions);
	} else if (!xfield) {
		return summary(params, chartOptions);
	} else if (xcodemap && ycodemap) {
		return codedVCoded(params, chartOptions);
	} else {
		return floatVFloat(params, chartOptions);
	}
}

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

var inRange = (number, {max, min}) => number >= min && number <= max;

function pickMetrics(yavg, range) {
	if (!range) {return yavg;}
	return Object.entries(yavg).reduce((acc,  [key, value]) => {
		if (inRange(_.first(value), range)) {
			acc[key] = value;
		}
		return acc;
	}, {});
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

function getMeasures({avgState, pctState, ycolumn}, yavg) {
	let measures = [];
	var centralMeasure = _.Let((n = avgOptions[avgState[ycolumn]]) => n && v(n.label));
	var pctMeasure = _.Let((n = pctOptions[pctState[ycolumn]]) => n && v(n.label));
	if (centralMeasure) {
		measures.push(centralMeasure);
	}
	if (pctMeasure) {
		measures.push(...pctRange[pctMeasure]);
	}
	return _.pick(yavg, measures);
}

function shouldCallDrawChart(prevProps, currentProps) {
	return !_.isEqual(
		{...prevProps, drawProps: _.omit(prevProps.drawProps, ['setView', 'setRange']), xenaState: _.omit(prevProps.xenaState, ['defaultValue', 'showWelcome'])},
		{...currentProps, drawProps: _.omit(currentProps.drawProps, ['setView', 'setRange']), xenaState: _.omit(currentProps.xenaState, ['defaultValue', 'showWelcome'])});
}

// XXX note duplication of parameters, as xcolumn, ycolumn, colorColumn are in
// chartState, and chartState is in xenaState. Clean this up. codemaps Should
// also be in xenaState, but check that binary cast to coded happens first.
function callDrawChart(xenaState, params) {
	var {ydata, xdata, doScatter, colorColumn} = params,
		{chartState, cohort, cohortSamples,
			samples: {length: samplesLength}} = xenaState,
		{chartType} = chartState,
		samplesMatched = _.getIn(xenaState, ['samplesMatched']),
		scatterColorData, scatterColorDataCodemap, scatterColorDataSegment,
		scatterColorScale;

	if (doScatter && v(colorColumn)) {
		scatterColorDataSegment = _.getIn(xenaState, ['data', colorColumn, 'req', 'rows']);
		let color;
		if (scatterColorDataSegment) {
			color = _.getIn(xenaState, ['columns', colorColumn, 'color']);
			let scale = colorScales.colorScale(color),
				[,,,, origin] = color;

			// see km.js:segmentedVals(). This is a work-around for
			// trend-amplitude scales. We should deprecate them.
			scatterColorScale = v => RGBToHex(...v < origin ? scale.lookup(0, origin - v) : scale.lookup(1, v - origin));
			scatterColorData = _.getIn(xenaState, ['data', colorColumn, 'avg', 'geneValues']);
		} else {
			color = _.getIn(xenaState, ['columns', colorColumn, 'colors', 0]);
			scatterColorScale = color && colorScales.colorScale(color);
			scatterColorData = _.getIn(xenaState, ['data', colorColumn, 'req', 'values']);
		}
		scatterColorDataCodemap = _.getIn(xenaState, ['columns', colorColumn, 'codes']);
		scatterColorData = scatterColorData[0];
	}

	var yavg = getMeasures(chartState, params.yavg);

	// XXX omit unused downstream params? e.g. chartState?
	return drawChart(_.merge(params, {
		chartType,
		cohort, cohortSamples, samplesLength, // why both cohortSamples an samplesLength??
		scatterColorScale, scatterColorData, scatterColorDataCodemap,
		samplesMatched,
		xdata, ydata, // normalized
		yavg,
	}));
};

class HighchartView extends PureComponent {
	componentDidMount() {
		sizeChartView();
		this.chart = callDrawChart(this.props.xenaState, this.props.drawProps);
		this.chart.redraw();
		this.chart.reflow();
		window.addEventListener('resize', () => sizeChartView());
	}

	componentWillUnmount() {
		this.chart?.destroy();
		this.chart = undefined;
		window.removeEventListener('resize', () => sizeChartView());
	}

	componentDidUpdate(prevProps) {
		if (shouldCallDrawChart(prevProps, this.props)) {
			this.chart.destroy();
			this.chart = callDrawChart(this.props.xenaState, this.props.drawProps);
			this.chart.redraw();
		} else {
			sizeChartView();
		}
		this.chart.reflow();
	}

	render() {
		return div({id: 'xenaChart', className: compStyles.chart});
	}
}
var highchartViewSelect = el(HighchartView); // XXX deprecate this?

var highchartView = props => highchartViewSelect(props);

var expMethods = {
	exp2: data => _.map(data, d => _.map(d, x => isNaN(x) ? x : Math.pow(2, x))),
	log2: data => _.map(data, d => _.map(d, x => isNaN(x) ? x : Math.log2(x + 1))),
	none: _.identity
};

var applyExp = (data, setting) =>
	expMethods[_.get(setting, 'value', 'none')](data);

var passAsArray = fn => (v, ...args) => fn([v], ...args)[0];

// transform data, compute stats
function applyTransforms(ydata, yexp, ynorm, xdata, xexp) {
	ydata = applyExp(ydata, yexp);
	xdata = xdata && applyExp(xdata, xexp);
	var yavg = fastats(ydata);

	var transform = ynorm === 'subset_stdev' ?
		(data, std, mean) => data.map(x => isNaN(x) ? x : (x - mean) / std) :
		(data, std, mean) => data.map(x => isNaN(x) ? x : x - mean);
	var statTransform = passAsArray(transform);

	if (v(ynorm)) {
		ydata = _.mmap(ydata, yavg.sd, yavg.mean, transform);
		yavg = _.mapObject(yavg, vs => _.mmap(vs, yavg.sd, yavg.mean, statTransform));
	}

	return {ydata, xdata, yavg};
}

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

class Chart extends PureComponent {
	constructor() {
		super();
		this.state = {advanced: false, dataType: undefined, inverted: false, range: undefined, view: undefined};
	}

	onClose = () => {
		gaEvents('spreadsheet', 'columnChart-close');
		this.props.callback(['heatmap']);
	}

	render() {
		var {callback, appState: xenaState} = this.props,
			{advanced, dataType, inverted, range, view} = this.state,
			{chartState} = xenaState,
			set = (...args) => {
				var cs = _.assocIn(chartState, ...args);
				callback(['chart-set-state', cs]);
			},
			setRange = (range) => this.setState({range}),
			setView = (view) => this.setState({view});

		// XXX note that this will also display if data is still loading, which is
		// a bit misleading.
		// XXX this should now be happening in ChartWizard, so we should drop this.
		if (!(v(chartState.ycolumn) && xenaState.cohort && xenaState.samples &&
			xenaState.columnOrder.length > 0)) {
			return box({display: 'flex', justifyContent: 'center', my: 12},
				card({elevation: 2},
					cardHeader({action: closeButton(() => callback(['heatmap']))}),
					cardContent('There is no plottable data. Please add some from the Visual Spreadsheet.')));
		}

		var {xcolumn, ycolumn, colorColumn} = chartState,
			{columns} = xenaState,
			xdata0 = getColumnValues(xenaState, xcolumn),
			xcodemap = _.getIn(columns, [xcolumn, 'codes']),
			ydata0 = getColumnValues(xenaState, ycolumn),
			ycodemap = _.getIn(columns, [ycolumn, 'codes']),
			yexpOpts = expOptions(columns[ycolumn], ydata0),
			xexpOpts = expOptions(columns[xcolumn], xdata0),
			xexp = xexpOpts[chartState.expState[xcolumn]],
			yexp = yexpOpts[chartState.expState[ycolumn]],
			ynorm = !ycodemap && _.get(normalizationOptions[
					chartState.normalizationState[chartState.ycolumn]], 'value'),
			xlabel = axisLabel(xenaState, xcolumn, !xcodemap, xexp),
			ylabel = axisLabel(xenaState, ycolumn, !ycodemap, yexp, ynorm),
			xfield = _.getIn(xenaState.columns, [xcolumn, 'fields', 0]),
			yfields = columns[ycolumn].probes ||
				columns[ycolumn].fieldList || columns[ycolumn].fields,
			isDot = view === 'dot',
			isDensity = view === 'density',
			// doScatter is really "show scatter color selector", which
			// we only do if y is single-valued.
			doScatter = !xcodemap && xfield && yfields.length === 1;

		var {ydata, xdata, yavg} = applyTransforms(ydata0, yexp, ynorm, xdata0, xexp),
			// doAvg is "show mean or median selector" and doPct is "percentile shown", which
			// we only do for density plots.
			doAvg = isDensity && 'mean' in yavg && 'median' in yavg,
			doPct = isDensity && 'mean' in yavg && 'sd' in yavg;
		// XXX is callback used??
		var drawProps = {ydata, ycolumn,
			xdata, xcolumn, doScatter, colorColumn, columns,
			xcodemap, ycodemap, yfields, xfield, xlabel, ylabel, callback,
			yavg: pickMetrics(addSDs(yavg), range),
			yexp,
			xexp,
			ynorm,
			dataType,
			inverted,
			setRange,
			setView,
		};

		var colorAxisDiv = doScatter ? axisSelector(xenaState, 'Color',
				ev => set(['colorColumn'], ev.target.value)) : null;
		var codedVCoded = v(xcolumn) && !isFloat(columns, xcolumn) && v(ycolumn) &&
			!isFloat(columns, ycolumn);
		var swapAxes = codedVCoded || doScatter ? button({color: 'secondary', disableElevation: true,
				onClick: gaSwap(() => set(['ycolumn'], xcolumn, ['xcolumn'], ycolumn)), variant: 'contained'},
				'Swap X and Y') : null;
		var invertAxes = isDot ? button({color: 'secondary', disableElevation: true,
				onClick: () => this.setState({inverted: !inverted}), variant: 'contained'},
				'Swap X and Y') : null;

		var switchDataType = isDot ?
			buildDropdown({
				label: 'Data type',
				onChange: (_, v) => this.setState({dataType: v}),
				opts: dataTypeOptions,
				value: dataType || 'bulk'}) : null;

		var yExp = ycodemap ? null :
			buildDropdown({
				opts: yexpOpts,
				index: chartState.expState[ycolumn],
				label: isDot ? 'Continuous data unit' : isDensity ? 'Data unit' : 'Y unit',
				onChange: i => set(['expState', ycolumn], i)});

		var xExp = !v(xcolumn) || xcodemap ? null :
			buildDropdown({
				opts: xexpOpts,
				index: chartState.expState[xcolumn],
				label: 'X unit',
				onChange: i => set(['expState', chartState.xcolumn], i)});

		var normalization = ycodemap ? null :
			buildDropdown({
				index: chartState.normalizationState[ycolumn],
				label: isDot ? 'Continuous data linear transform' : isDensity ? 'Data linear transform' : 'Y data linear transform',
				onChange: i => set(['normalizationState', chartState.ycolumn], i),
				opts: normalizationOptions});

		var viewOpts = filterViewOptions(viewOptions, xfield),
		switchView = (xcodemap && !ycodemap) || (!v(xcolumn) && yfields.length > 1) ?
			buildDropdown({
				label: 'Chart type',
				onChange: (_, v) => gaChartType(() => set(['chartType'], v))(v),
				opts: viewOpts,
				value: view}) : null;

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

		var HCV = highchartView({xenaState, drawProps});

		// statistics XXX note that we scribble over stats. Should either render
		// it in react, or make another wrapper component so react won't touch it.
		// otoh, since we always re-render, it kinda works as-is.

		return box({className: compStyles.chartView, id: 'chartView'},
				card({className: compStyles.card},
					div({className: compStyles.chartRender},
						closeButton(this.onClose),
						HCV,
						typography({id: 'stats', className: compStyles.stats, component: 'div', variant: 'caption'}))),
				card({className: classNames(compStyles.card, compStyles.chartActions)},
					div({className: compStyles.chartActionsPrimary},
						div({className: compStyles.chartActionsButtons},
							button({color: 'secondary', disableElevation: true, onClick: gaAnother(() => set(['another'], true)), variant: 'contained'}, 'Make another graph'),
							swapAxes, invertAxes, switchView, switchDataType), avg, pct, colorAxisDiv && colorAxisDiv),
						yExp && advOpt));
	};
}

// Implement a custom 'legendRadius' to override the marker.radius
// in the legend.
Highcharts.wrap(Highcharts.Series.prototype, 'drawLegendSymbol',
	function (proceed, legend) {
		var lr = _.getIn(legend, ['chart', 'userOptions', 'plotOptions',
			'scatter', 'marker', 'legendRadius']);
		if (lr) {
			var r = this.options.marker.radius;
			this.options.marker.radius = lr;
			proceed.call(this, legend);
			this.options.marker.radius = r;
		} else {
			proceed.call(this, legend);
		}
	});


export default Chart;
