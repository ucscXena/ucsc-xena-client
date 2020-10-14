var React = require('react');
import PureComponent from '../PureComponent';
var {hexToRGB, colorStr, RGBToHex} = require ('../color_helper').default;
var Highcharts = require('highcharts/highstock');
require('highcharts/highcharts-more')(Highcharts);
var highchartsHelper =  require ('./highcharts_helper');
require('highcharts/modules/boost')(Highcharts);
var _ = require('../underscore_ext').default;
import * as colorScales from '../colorScales';
var jStat = require('jStat').jStat;
var gaEvents = require('../gaEvents');
import multi from '../multi';
import {suitableColumns, columnLabel, v} from './utils.js';
import {Button} from 'react-toolbox/lib/button';
import {Card} from 'react-toolbox/lib/card';
import classNames from 'classnames';

// Styles
var compStyles = require('./chart.module.css');

var isChild = x => x === null || typeof x === 'string' || React.isValidElement(x);
// Render tag with list of children, and optional props as first argument.
var el = type => (...args) =>
	args.length === 0 ? React.createElement(type, {}) :
	isChild(args[0]) ? React.createElement(type, {}, ...args) :
	React.createElement(type, args[0], ...args.slice(1));

var div = el('div');
var select = el('select');
var option = el('option');
var label = el('label');

var button = el(Button);
var card = el(Card);

var textNode = _.identity;


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
			[xlist, ylist] = _.unzip(_.filter(_.zip(xVector, yVector), function (x) {return x[0] != null && x[1] != null;})),
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

var getOpt = opt => option({key: opt.value, ...opt});

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

function buildNormalizationDropdown(index, onUpdate) {
	var dropDownDiv =
		select({
				className: 'form-control',
				value: normalizationOptions[index || 0].value,
				onChange: ev => onUpdate(ev.currentTarget.selectedIndex)},
			...normalizationOptions.map(getOpt));

	return div({className: compStyles.column},
			label(textNode("Y data linear transform ")),
			dropDownDiv);
}

function buildExpDropdown({opts, index, label: text, onChange}) {
	var dropDownDiv =
		select({className: 'form-control', value: opts[index || 0].value,
				onChange: ev => onChange(ev.currentTarget.selectedIndex)},
				...opts.map(getOpt));

	return div({className: compStyles.column}, label(textNode(text)), dropDownDiv);
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
		value = storedColumn || 'none',
		sel;

	sel = select({className: 'form-control', value, onChange},
		...axisOpts.map(getOpt));

	return (
		div({className: compStyles.column},
			label(textNode(text)), div(sel)));
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

function newChart(chartOptions, callback) {
	chartOptions = _.deepMerge(chartOptions, {
		exporting: {
			buttons: {
				contextButton: {enabled: false},
				closeButton: {
					text: 'CLOSE',
					onclick: function () {
						gaEvents('spreadsheet', 'columnChart-close');
						callback(['heatmap']);
					}
				}
			}
	}});
	return new Highcharts.Chart(chartOptions);
}

// group field0 by code0, where field1 has value
function groupIndexWithValueByCode(field0, codes0, field1) {
	var indicies = _.range(field0.length).filter(i => field1[i] != null);
	var groups = _.groupBy(indicies, i => codes0[field0[i]]);
	delete groups[undefined];
	return groups;
}


// XXX We should really group by value, and covert values
// to codes late, but the current implementation uses
// codes early.
function groupIndexByCode(field, codes) {
	var groups = _.groupBy(_.range(field.length), i => codes[field[i]]);
	delete groups[undefined];
	return groups;
}

// XXX as above, we should instead group by value and map to
// codes late.
// Group values of field0 by codes of field1. Omit null in field0,
// and empty code groups.
function groupValuesByCodes(field0, field1, codes1) {
	var groups = _.groupBy(field0, (v, i) => codes1[field1[i]]);
	delete groups[undefined]; // skip empty code groups
	return _.mapObject(groups, g => g.filter(x => x != null)); // skip field0 nulls
}

// poor man's lazy seq
function* constantly (fn) {
	while (true) {
		yield fn();
	}
}

function initFVCMatrices({xCategories, yfields, ydata, xdata, xcodemap, STDEV}) {
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
	var [meanMatrix, medianMatrix, upperMatrix, lowerMatrix,
		upperwhiskerMatrix, lowerwhiskerMatrix, stdMatrix, nNumberMatrix] =
			constantly(() =>
				_.times(xCategories.length, () => new Array(yfields.length).fill(NaN)));

	// Y data and fill in the matrix
	for (let k = 0; k < yfields.length; k++) {
		let yfield = yfields[k];
		let ydataElement = ydata[k];
		let ybinnedSample = groupValuesByCodes(ydataElement, xdata[0], xcodemap);

		for (let i = 0; i < xCategories.length; i++) {
			let code = xCategories[i];
			let data, m;
			if (ybinnedSample[code].length) {
				data = ybinnedSample[code],
				m = data.length;

				data.sort((a, b) => a - b);
				let average =  highchartsHelper.average(data);
				let stdDev = highchartsHelper.standardDeviation(data, average);

				// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
				var median = data[Math.floor( m / 2)],
					lower =  data[Math.floor( m / 4)],
					upper =  data[Math.floor( 3 * m / 4)],
					whisker = 1.5 * (upper - lower),
					upperwhisker = _.findIndex(data, x => x > upper + whisker),
					lowerwhisker = _.findLastIndex(data, x => x < lower - whisker);

				upperwhisker = (upperwhisker === -1) ? data[data.length - 1 ] : data[upperwhisker - 1];
				lowerwhisker = (lowerwhisker === -1) ? data[0] : data[lowerwhisker + 1];
				meanMatrix[i][k] = average / STDEV[yfield];
				medianMatrix[i][k] = median / STDEV[yfield];
				lowerMatrix[i][k] = lower / STDEV[yfield];

				upperMatrix[i][k] = upper / STDEV[yfield];
				lowerwhiskerMatrix[i][k] = lowerwhisker / STDEV[yfield];
				upperwhiskerMatrix[i][k] = upperwhisker / STDEV[yfield];
				nNumberMatrix[i][k] = m;

				if (!isNaN(stdDev)) {
					stdMatrix[i][k] = stdDev / STDEV[yfield];
				} else {
					stdMatrix[i][k] = NaN;
				}
			} else {
				nNumberMatrix[i][k] = 0;
			}
		}
	}
	return {meanMatrix, medianMatrix, upperMatrix, lowerMatrix, upperwhiskerMatrix,
			lowerwhiskerMatrix, stdMatrix, nNumberMatrix};
}

function sortMatrices(xCategories, matrices) {
	let {medianMatrix} = matrices,
		sortedIndex = _.sortBy(
				_.range(medianMatrix.length).filter(i => !isNaN(medianMatrix[i][0])),
				i => medianMatrix[i][0]),
			reorder = m => _.map(sortedIndex, i => m[i]);

	return [reorder(xCategories), _.mapObject(matrices, m => reorder(m))];
}

var cutOffset = (average, offset) => !isNaN(average) ? average - offset : "";
var cutOffsetFn = offsetsSeries =>
	values => _.mmap(values, offsetsSeries, cutOffset);

function floatVCoded({samplesLength, xcodemap, xdata,
		yfields, ycodemap, ydata,
		offsets, xlabel, ylabel, STDEV,
		samplesMatched,
		columns, xcolumn, callback}, chartOptions) {

	var statsDiv = document.getElementById('stats'),
		ybinnedSample,
		yfield,
		ydataElement,
		showLegend,
		pValue, dof;

	var xbinnedSample = groupIndexByCode(xdata[0], xcodemap);
	var xCategories = xcodemap.filter(c => xbinnedSample[c]);

	// highlight categories identification: if all the samples in the category
	// are part of the highlighted samples, the caterory will be highlighted
	var highlightcode = (samplesMatched && samplesMatched.length !== samplesLength) ?
		xCategories.filter(code =>
			xbinnedSample[code].every(s => samplesMatched.indexOf(s) !== -1)) :
		[];

	var matrices =
		initFVCMatrices({xCategories, yfields, ydata, xdata, xcodemap, STDEV});

	// sort by median of xCategories if yfiedls.length === 1
	if (xCategories.length > 0 && yfields.length === 1) {
		[xCategories, matrices] = sortMatrices(xCategories, matrices);
	}
	var {meanMatrix, medianMatrix, upperMatrix, lowerMatrix, upperwhiskerMatrix,
			lowerwhiskerMatrix, stdMatrix, nNumberMatrix} = matrices,
		// offsets
		cutOffsets = cutOffsetFn(yfields.map(field => offsets[field] / STDEV[field])),
		scale = colorScales.colorScale(columns[xcolumn].colors[0]),
		invCodeMap = _.invert(xcodemap);

	// column chart setup
	chartOptions = highchartsHelper.columnChartFloat(chartOptions, yfields, xlabel, ylabel);
	var chart = newChart(chartOptions, callback);
	showLegend = true;

	xCategories.forEach((code, i) => {
		// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
		var medianSeries = cutOffsets(medianMatrix[i]),
			upperSeries = cutOffsets(upperMatrix[i]),
			lowerSeries = cutOffsets(lowerMatrix[i]),
			upperwhiskerSeries = cutOffsets(upperwhiskerMatrix[i]),
			lowerwhiskerSeries = cutOffsets(lowerwhiskerMatrix[i]),
			nNumberSeries = nNumberMatrix[i],
			color = highlightcode.length === 0 ? scale(invCodeMap[code]) :
				highlightcode.indexOf(code) === -1 ? '#A9A9A9' :
				'gold',
			dataSeries = _.zip(lowerwhiskerSeries, lowerSeries, medianSeries,
					upperSeries, upperwhiskerSeries);
		highchartsHelper.addSeriesToColumn(
			chart, 'boxplot', code,
			dataSeries, ycodemap,
			yfields.length * xCategories.length < 30, showLegend,
			color,
			nNumberSeries);
	});

	// p value when there is only 2 group comparison student t-test
	// https://en.wikipedia.org/wiki/Welch%27s_t-test
	if (xCategories.length === 2) {
		statsDiv.innerHTML = 'Welch\'s t-test<br>';
		_.range(yfields.length).map(k => {
			if (nNumberMatrix[0][k] > 1 && nNumberMatrix[1][k] > 1) {
				yfield = yfields[k];
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
					cdf;

				dof = vCombined * vCombined / ((v1 / n1) * (v1 / n1) / (n1 - 1) + (v2 / n2) * (v2 / n2) / (n2 - 1)), // degree of freedom
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
	else if (xCategories.length > 2) {
		statsDiv.innerHTML = 'One-way Anova<br>';
		_.range(yfields.length).map(k => {
			yfield = yfields[k];
			ydataElement = ydata[k];
			ybinnedSample = groupValuesByCodes(ydataElement, xdata[0], xcodemap);

			let flattenArray = _.flatten(xCategories.map(code => ybinnedSample[code])),
				// Calculate the overall mean
				totalMean = flattenArray.reduce((sum, el) => sum + el, 0) / flattenArray.length,
				//Calculate the "between-group" sum of squared differences
				sB = _.range(xCategories.length).reduce((sum, index) => {
					if (nNumberMatrix[index][0] > 0) {
						return sum + nNumberMatrix[index][k] * Math.pow((meanMatrix[index][k] - totalMean), 2);
					} else {
						return sum;
					}
				}, 0),
				// between-group degrees of freedom
				fB = _.range(xCategories.length).filter(index => nNumberMatrix[index][k] > 0).length - 1,
				// between-group mean square differences
				msB = sB / fB,
				// Calculate the "within-group" sum of squares
				sW = _.range(xCategories.length).reduce((sum, index) => {
					if (nNumberMatrix[index][k] > 0) {
						return sum + Math.pow(stdMatrix[index][k], 2) * nNumberMatrix[index][k];
					} else {
						return sum;
					}
				}, 0),
				// within-group degrees of freedom
				fW = _.range(xCategories.length).reduce((sum, index) => {
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

	chart.redraw();
	return chart;
}

// single column
function summary({
		yfields, ycodemap, ydata,
		offsets, xlabel, ylabel, STDEV,
		callback}, chartOptions) {

	var xAxisTitle,
		ybinnedSample,
		dataSeriese,
		nNumberSeriese,
		yfield,
		ydataElement,
		showLegend,
		categories,
		k,
		total, chart;
	var displayCategories;

	dataSeriese = [];
	nNumberSeriese = [];
	ybinnedSample = {};

	for (k = 0; k < yfields.length; k++) {
		yfield = yfields[k];
		ydataElement = ydata[k];

		if (ycodemap) { //  fields.length ==1
			ybinnedSample = groupIndexByCode(ydataElement, ycodemap);
		} else { // floats
			ybinnedSample[yfield] = ydataElement.filter(x => x != null);
		}
	}

	total = 0;
	if (ycodemap) {
		categories = Object.keys(ybinnedSample);
		categories.forEach(function (code) {
			total = total + ybinnedSample[code].length;
		});
	} else {
		categories = yfields;
	}

	// single parameter float do historgram with smart tick marks
	if (!ycodemap && yfields.length === 1) {
		var valueList = _.values(ybinnedSample)[0],
			offset = _.values(offsets)[0],
			stdev = _.values(STDEV)[0];

		valueList.sort((a, b) => a - b);

		var min = valueList[0],
			max = valueList[valueList.length - 1],
			N = 20,
			gap = (max - min) / (N * stdev),
			gapRoundedLower =  Math.pow(10, Math.floor(Math.log(gap) / Math.LN10)), // get a sense of the scale the gap, 0.01, 0.1, 1, 10 ...
			gapList = [gapRoundedLower, gapRoundedLower * 2, gapRoundedLower * 5, gapRoundedLower * 10], // within the scale, find the closet to this list of easily readable intervals 1,2,5,10
			gapRounded = _.min(gapList, x => Math.abs(gap - x )),
			maxRounded = Math.ceil((max - offset) / stdev / gapRounded) * gapRounded,
			minRounded = Math.floor((min - offset) / stdev / gapRounded) * gapRounded;

		categories = _.range(minRounded, maxRounded, gapRounded);
		categories = categories.map( bin =>
			(Math.floor(bin * 100) / 100) + ' to ' + (Math.floor((bin + gapRounded) * 100) / 100));
		ybinnedSample = {};
		categories.map(bin => ybinnedSample[bin] = 0);
		valueList.map( value => {
			var binIndex = Math.floor(((value - offset) / stdev - minRounded) / gapRounded),
				bin = categories[binIndex];
			ybinnedSample[bin] = ybinnedSample[bin] + 1;
		});
	}

	xAxisTitle = xlabel;
	showLegend = false;

	displayCategories = categories.slice(0);
	if (ycodemap) {
		chartOptions = highchartsHelper.columnChartOptions(
			chartOptions, categories.map(code => code + " (" + ybinnedSample[code].length + ")"),
			xAxisTitle, "Distribution", ylabel, showLegend);
	} else if (yfields.length === 1) {
		chartOptions = highchartsHelper.columnChartOptions(
			chartOptions, categories, xAxisTitle, "Histogram", ylabel, showLegend);
	} else {
		chartOptions = highchartsHelper.columnChartFloat (chartOptions, displayCategories, xAxisTitle, ylabel);
	}
	chart = newChart(chartOptions, callback);

	//add data to seriese
	displayCategories.forEach(function (code) {
		var value;
		if (ycodemap) {
			value = ybinnedSample[code].length;
			dataSeriese.push(value * 100 / total);
			nNumberSeriese.push(value);
		} else if (yfields.length === 1) {
			value = ybinnedSample[code];
			dataSeriese.push(value);
		} else {
			var data = ybinnedSample[code],
				m = data.length;
			data.sort((a, b) => a - b);

			// http://onlinestatbook.com/2/graphing_distributions/boxplots.html
			var median = data[Math.floor( m / 2)],
				lower =  data[Math.floor( m / 4)],
				upper =  data[Math.floor( 3 * m / 4)],
				whisker = 1.5 * (upper - lower),
				upperwhisker = _.findIndex(data, x => x > upper + whisker),
				lowerwhisker = _.findLastIndex(data, x => x < lower - whisker);

			upperwhisker = (upperwhisker === -1) ? data[data.length - 1 ] : data[upperwhisker - 1];
			lowerwhisker = (lowerwhisker === -1) ? data[0] : data[lowerwhisker + 1];

			median = (median - offsets[code]) / STDEV[code];
			lower = (lower - offsets[code]) / STDEV[code];
			upper = (upper - offsets[code]) / STDEV[code];
			upperwhisker = (upperwhisker - offsets[code]) / STDEV[code];
			lowerwhisker = (lowerwhisker - offsets[code]) / STDEV[code];

			dataSeriese.push([lowerwhisker, lower, median, upper, upperwhisker]);
			nNumberSeriese.push(m);
		}
	});

	// add seriese to chart
	var seriesLabel, chartType;

	if (ycodemap) {
		seriesLabel = " ";
		chartType = 'column';
	} else if (yfields.length === 1) {
		seriesLabel = " ";
		chartType = 'line';
	} else {
		seriesLabel = "average";
		chartType = 'boxplot';
	}
	highchartsHelper.addSeriesToColumn(chart, chartType, seriesLabel,
		dataSeriese, ycodemap, categories.length < 30, showLegend,
		0, nNumberSeriese);
	chart.redraw();
	return chart;
}

function codedVCoded({xcodemap, xdata, ycodemap, ydata, xlabel, ylabel,
		columns, ycolumn, callback}, chartOptions) {

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

	chart = newChart(chartOptions, callback);

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
		for (k = 0; k < categories.length; k++) {
			observed[i][k] = _.intersection(ybinnedSample[code], xbinnedSample[categories[k]]).length;
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

		highchartsHelper.addSeriesToColumn(
			chart, 'column', code, ycodeSeries, ycodemap,
			ycodemap.length * categories.length < 30, showLegend,
			scale(invCodeMap[code]), observed[i]);
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

	chart.redraw();
	return chart;
}

function floatVFloat({samplesLength, xfield, xdata,
		yfields, ydata,
		offsets, xlabel, ylabel, STDEV,
		scatterColorScale, scatterColorData, scatterColorDataCodemap,
		samplesMatched,
		columns, colorColumn, cohortSamples, callback}, chartOptions) {

	var statsDiv = document.getElementById('stats'),
		yfield,
		i, k,
		average, stdDev,
		chart;

	var sampleLabels = cohortSamples,
		x, y;

	chartOptions = highchartsHelper.scatterChart(chartOptions, xlabel, ylabel, samplesLength);

	if (yfields.length > 1) { // y multi-subcolumns -- only happen with genomic y data
		chart = newChart(chartOptions, callback);

		for (k = 0; k < yfields.length; k++) {
			var series = [];

			yfield = yfields[k];
			for (i = 0; i < xdata[0].length; i++) {
				x = xdata[0][i];
				y = ydata[k][i];
				if (null != x && null != y) {
					y = (y - offsets[yfield]) / STDEV[yfield];
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
			if ("null" === code) {
				return gray;
			}
			return colorStr(hexToRGB(colorScales.categoryMore[code % colorScales.categoryMore.length], opacity));
		};

		if (!useCodedSeries) {
			average = highchartsHelper.average(scatterColorData);
			stdDev = highchartsHelper.standardDeviation(scatterColorData, average);
			colorMin = _.minnull(scatterColorData);
			bin = stdDev * 0.1;
			colorScale = v => v == null ? 'gray' : scatterColorScale(v);
		}

		chartOptions = _.deepMerge(chartOptions, {
			legend: {title: {text: ''}}
		});
		chart = newChart(chartOptions, callback);

		yfield = yfields[0];
		for (i = 0; i < xdata[0].length; i++) {
			x = xdata[0][i];
			y = ydata[0][i];
			if (scatterColorData) {
				colorCode = scatterColorData[i];
			} else {
				colorCode = 0;
			}

			if (null != x && null != y && null != colorCode) {
				y = (y - offsets[yfield]) / STDEV[yfield];
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
						colorLabel: scatterColorData[i],
						name: sampleLabels[i],
						x: x,
						y: y,
					});
				}

				if (samplesMatched && samplesLength !== samplesMatched.length &&
					samplesMatched.indexOf(i) !== -1) {
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
				color = null;
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
			};
		} else {
			printPearsonAndSpearmanRho(statsDiv, xfield, yfields, xdata[0], ydata);
		}

		statsDiv.classList.toggle(compStyles.visible);
	}

	chart.redraw();
	return chart;
}

function drawChart(params) {
	var {cohort, samplesLength, xfield, xcodemap, ycodemap } = params,
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

var getColumnValues = multi(({columns}, id) => v(id) && columns[id].valueType);
getColumnValues.add('float', ({data}, id) => _.getIn(data[id], ['req', 'values']));
getColumnValues.add('coded', ({data}, id) => _.getIn(data[id], ['req', 'values']));
getColumnValues.add('segmented', ({data}, id) => _.getIn(data[id], ['avg', 'geneValues']));
getColumnValues.add('undefined', () => undefined);

var dataOffsets = (norm, data, fields) =>
	!norm ? _.object(fields, _.times(fields.length, () => 0)) :
	_.object(fields,
		_.map(data, d => highchartsHelper.average(_.filter(d, x => x != null))));

function axisLabel({columns, columnOrder}, id, showUnits, opts, expState, norm) {
	if (!v(id)) {
		return '';
	}
	var label = columnLabel(columnOrder.indexOf(id), columns[id]),
		unit = showUnits ? '<br>Unit: ' + opts[expState[id]].label : '',
		noralization = norm === 'subset' ? '<br>mean-centered' :
			norm === 'subset_stdev' ? '<br>z-tranformed' : '';
	return label + unit + noralization;
}

var expMethods = {
	exp2: data => _.map(data, d => _.map(d, x => x != null ? Math.pow(2, x) : null)),
	log2: data => _.map(data, d => _.map(d, x => x != null ? Math.log2(x + 1) : null)),
	none: _.identity
};

var applyExp = (data, setting) =>
	expMethods[_.get(setting, 'value', 'none')](data);

// this looks expensive
var isBinary = (codes, data) => !codes && data &&
	_.flatten(data).every(c => _.indexOf([0, 1], c) !== -1 || c == null);

// treat binary float as categorical
function getCodes(columns, data, id) {
	var codes = _.getIn(columns, [id, 'codes']);
	return isBinary(codes, data) ? ['0', '1'] : codes;
}

function getStdev(fields, data, norm) {
	var stdev = (norm !== 'subset_stdev') ?
		new Array(fields.length).fill(1) :
		fields.map((field, i) => {
			var subcol = data[i].filter(x => x != null),
				ave = highchartsHelper.average(subcol);
			return highchartsHelper.standardDeviation(subcol, ave);
		});
	return _.object(fields, stdev);
}

function callDrawChart(xenaState, params) {
	var {ydata, yexpOpts, chartState, ycolumn,
			xdata, xexpOpts, xcolumn, doScatter, colorColumn, columns,
			xcodemap, ycodemap, destroy, yfields, xfield, callback} = params,
		{cohort, cohortSamples, samples: {length: samplesLength}} = xenaState,
		samplesMatched = _.getIn(xenaState, ['samplesMatched']),
		scatterColorData, scatterColorDataCodemap, scatterColorDataSegment,
		scatterColorScale;

	ydata = applyExp(ydata, yexpOpts[chartState.expState[ycolumn]]);
	xdata = xdata && applyExp(xdata, xexpOpts[chartState.expXState[xcolumn]]);

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

	var yNormalization = !ycodemap &&
		_.Let((n = normalizationOptions[
					chartState.normalizationState[chartState.ycolumn]]) =>
				n && v(n.value));

	var STDEV = getStdev(yfields, ydata, yNormalization);

	var xlabel = axisLabel(xenaState, xcolumn, !xcodemap, xexpOpts,
			chartState.expXState);

	var ylabel = axisLabel(xenaState, ycolumn, !ycodemap, yexpOpts,
			chartState.expState, yNormalization);

	destroy();
	return drawChart({cohort, samplesLength, xfield, xcodemap, xdata,
		yfields, ycodemap, ydata,
		offsets: dataOffsets(yNormalization, ydata, yfields), xlabel, ylabel, STDEV,
		scatterColorScale, scatterColorData, scatterColorDataCodemap,
		samplesMatched, columns, xcolumn, ycolumn, colorColumn, cohortSamples, callback});
};

class HighchartView extends PureComponent {
	shouldComponentUpdate() {
		return false;
	}

	componentDidMount() {
		callDrawChart(this.props.xenaState, this.props.drawProps);
	}

	componentWillReceiveProps(newProps) {
		if (!_.isEqual(newProps, this.props)) {
			callDrawChart(newProps.xenaState, newProps.drawProps);
		}
	}

	render() {
		return div({id: 'xenaChart', className: compStyles.chart});
	}
}
var highchartView = el(HighchartView);

class Chart extends PureComponent {

	destroy = () => {
		if (this.chart) {
			this.chart.destroy();
			this.chart = undefined;
		}
	}

	componentWillUnmount() {
		this.destroy();
	}

	render() {
		var {callback, appState: xenaState} = this.props,
			{chartState} = xenaState,
			set = (...args) => {
				chartState = _.assocIn(chartState, ...args);
				callback(['chart-set-state', chartState]);
			};

		// XXX note that this will also display if data is still loading, which is
		// a bit misleading.
		if (!(v(chartState.ycolumn) && xenaState.cohort && xenaState.samples &&
				xenaState.columnOrder.length > 0)) {
			return card({className: classNames(compStyles.ChartView, compStyles.error)},
				"There is no plottable data. Please add some from the Visual Spreadsheet.",
				button({label: 'Close', onClick: () => callback(['heatmap'])}));
		}

		var {xcolumn, ycolumn, colorColumn, advanced} = chartState,
			{columns} = xenaState,
			xdata = getColumnValues(xenaState, xcolumn),
			xcodemap = getCodes(columns, xdata, xcolumn),
			ydata = getColumnValues(xenaState, ycolumn),
			ycodemap = getCodes(columns, ydata, ycolumn),
			yexpOpts = expOptions(columns[ycolumn], ydata),
			xexpOpts = expOptions(columns[xcolumn], xdata),
			xfield = _.getIn(xenaState.columns, [xcolumn, 'fields', 0]),
			yfields = columns[ycolumn].fields,
			// doScatter is really "show scatter color selector", which
			// we only do if y is single-valued.
			doScatter = !xcodemap && xfield && yfields.length === 1;

		var drawProps = {ydata, yexpOpts, chartState, ycolumn,
			xdata, xexpOpts, xcolumn, doScatter, colorColumn, columns,
			xcodemap, ycodemap, destroy: this.destroy, yfields, xfield, callback};

		var colorAxisDiv = doScatter ? axisSelector(xenaState, 'Color',
				ev => set(['colorColumn'], ev.currentTarget.value)) : null;
		var swapAxes = doScatter ? button({label: 'Swap X and Y',
			onClick: () => set(['ycolumn'], xcolumn, ['xcolumn'], ycolumn)}) : null;

		var yExp = ycodemap ? null :
			buildExpDropdown({
				opts: yexpOpts,
				index: chartState.expState[ycolumn],
				label: 'Y unit',
				onChange: i => set(['expState', ycolumn], i)});

		var xExp = !v(xcolumn) || xcodemap ? null :
			buildExpDropdown({
				opts: xexpOpts,
				index: chartState.expXState[xcolumn],
				label: 'X unit',
				onChange: i => set(['expXState', chartState.xcolumn], i)});

		var normalization = ycodemap ? null :
			buildNormalizationDropdown(
				chartState.normalizationState[ycolumn],
				i => set(['normalizationState', chartState.ycolumn], i));

		var advOpt = advanced ?
			div({id: 'controlPanel', className: compStyles.controlPanel},
				div(
					div({className: compStyles.row},
						yExp,
						normalization),
					div({className: compStyles.row},
						xExp),
					div({className: compStyles.row}, colorAxisDiv))) : null;

		var HCV =
			div(highchartView({xenaState, drawProps}),
				advOpt);


		// statistics XXX note that we scribble over stats. Should either render
		// it in react, or make another wrapper component so react won't touch it.
		// otoh, since we always re-render, it kinda works as-is.

		return div({className: compStyles.ChartView},
				HCV,
				div({className: compStyles.right},
					div({id: 'stats', className: compStyles.stats}),
					div({className: compStyles.actions},
						button({label: 'Make another graph', onClick:
						() => set(['setColumn'], ycolumn)}),
						swapAxes,
						button({label: advanced ? 'Hide options' : 'Advanced options',
							onClick: () => set(['advanced'], !advanced)}))));
	};
}

export default Chart;
