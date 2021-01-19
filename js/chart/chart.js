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
import {Button, IconButton} from 'react-toolbox/lib/button';
import {Card} from 'react-toolbox/lib/card';
import classNames from 'classnames';
var sc = require('science');
import {div, select, option, label, el, textNode} from './react-hyper';

var nrd = sc.stats.bandwidth.nrd;
var variance = sc.stats.variance;

function kde() {
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

var button = el(Button);
var iconButton = el(IconButton);
var card = el(Card);

// group field0 by code0, where field1 has value
function groupIndexWithValueByCode(field0, codes0, field1) {
	var indicies = _.range(field0.length).filter(i => field1[i] != null);
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
	delete groups.null;
	return groups;
}

var groupValues = (field, groups) =>
	groups.map(indices => indices.map(i => field[i]).filter(x => x != null));

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

function newChart(opts) {
	return new Highcharts.Chart(opts);
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

var fvcOptions = violin => violin ?
	highchartsHelper.violinOptions :
	highchartsHelper.boxplotOptions;

var fvcChart = violin => violin ?
	violinplot : boxplot;

// It might make sense to split this into two functions instead of having
// two polymorphic calls in here, and not much else.
function boxOrViolin({groups, xCategories, colors, yfields, ydata,
		xlabel, ylabel, violin}, chartOptions) {

	var matrices = initFVCMatrices({ydata, groups});

	// sort by median of xCategories if yfields.length === 1
	if (xCategories.length > 0 && yfields.length === 1) {
		[xCategories, groups, colors, matrices] = sortMatrices(xCategories, groups, colors, matrices);
	}

	chartOptions = fvcOptions(violin)({chartOptions, series: xCategories.length,
		categories: yfields, xAxisTitle: xlabel, yAxisTitle: ylabel});

	var chart = newChart(chartOptions);

	fvcChart(violin)({xCategories, groups, matrices, yfields, ydata, colors, chart});

	if (xCategories.length === 2) {
		welch(matrices, yfields);
	} else if (xCategories.length > 2) {
		anova({matrices, yfields, ydata, groups});
	}

	chart.redraw();
	return chart;
}

// compute group sample indices, codes, and colors, then draw
// box or violin plot.
function floatVCoded({xdata, xcodemap, xcolumn, columns, cohortSamples,
		samplesMatched, ...params}, chartOptions) {

	var groupsByValue = groupIndex(xdata[0]),
		values = _.range(xcodemap.length).filter(v => groupsByValue[v]),
		xCategories = values.map(v => xcodemap[v]),
		groups = values.map(v => groupsByValue[v]);


	var highlightValue = samplesMatched &&
				samplesMatched.length !== cohortSamples.length ?
		_.Let((matches = new Set(samplesMatched)) =>
			new Set(values.filter((v, i) => groups[i].every(s => matches.has(s))))) :
		null;

	var scale = highlightValue ?
		v => highlightValue.has(v) ? 'gold' : '#A9A9A9' :
		colorScales.colorScale(columns[xcolumn].colors[0]);

	var colors = values.map(scale);

	return boxOrViolin({groups, xCategories, colors, ...params}, chartOptions);
}

function densityplot({yfields: [field], ylabel: Y, ydata: [data]}, chartOptions) {
	chartOptions = highchartsHelper.densityChart({chartOptions, yaxis: field, Y});
	var nndata = _.filter(data, x => x !== null),
		min = _.min(nndata),
		max = _.max(nndata),
		points = 100, // number of points to interpolate, on screen
		N = nndata.length,
		density = kde().sample(nndata)
			(_.range(min, max, (max - min) / points))
			// area is one. If we multiply by N, the area is N, and the y axis
			// is samples per x-axis unit.
			.map(([x, d]) => [x, d * N]);

	var chart = newChart(chartOptions);
	highchartsHelper.addSeriesToColumn({
		chart,
		type: 'areaspline',
		data: density,
		marker: {enabled: false}});
	chart.redraw();
	return chart;
}

function summaryBoxplot(params, chartOptions) {
	var {cohortSamples} = params,
		groups = [_.range(0, cohortSamples.length)],
		colors = ['#0000FF80', 'blue'],
		xCategories = [null];
	return boxOrViolin({groups, colors, xCategories, ...params}, chartOptions);
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
		color: 0,
		description: nNumberSeries});
	chart.redraw();
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

	chart.redraw();
	return chart;
}

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
				if (null != x && null != y) {
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

			if (null != x && null != y && null != colorCode) {
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

var getColumnValues = multi(({columns}, id) => v(id) && columns[id].valueType);
getColumnValues.add('float', ({data}, id) => _.getIn(data[id], ['req', 'values']));
getColumnValues.add('coded', ({data}, id) => _.getIn(data[id], ['req', 'values']));
getColumnValues.add('segmented', ({data}, id) => _.getIn(data[id], ['avg', 'geneValues']));
getColumnValues.add('undefined', () => undefined);

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

var expMethods = {
	exp2: data => _.map(data, d => _.map(d, x => x != null ? Math.pow(2, x) : null)),
	log2: data => _.map(data, d => _.map(d, x => x != null ? Math.log2(x + 1) : null)),
	none: _.identity
};

var applyExp = (data, setting) =>
	expMethods[_.get(setting, 'value', 'none')](data);

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

// XXX note duplication of parameters, as xcolumn, ycolumn, colorColumn are in
// chartState, and chartState is in xenaState. Clean this up. codemaps Should
// also be in xenaState, but check that binary cast to coded happens first.
function callDrawChart(xenaState, params) {
	var {ydata, yexp, ycolumn, xdata, xexp, xcolumn, doScatter,
			colorColumn, xcodemap, ycodemap, destroy, yfields} = params,
		{chartState, cohort, cohortSamples,
			samples: {length: samplesLength}} = xenaState,
		{violin} = chartState,
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

	ydata = applyExp(ydata, yexp);
	xdata = xdata && applyExp(xdata, xexp);

	var yNormalization = !ycodemap &&
		_.Let((n = normalizationOptions[
					chartState.normalizationState[chartState.ycolumn]]) =>
				n && v(n.value));


	if (yNormalization) {
		// mean normalize
		ydata = ydata.map(data => {
			var mean = _.meannull(data);
			return data.map(x => x === null ? x : x - mean);
		});
	}

	if (!ycodemap) {
		let STDEV = getStdev(yfields, ydata, yNormalization);
		// z-score
		ydata = ydata.map((data, i) => _.map(data, d => d === null ? null : d / STDEV[yfields[i]]));
	}

	var xlabel = axisLabel(xenaState, xcolumn, !xcodemap, xexp);

	var ylabel = axisLabel(xenaState, ycolumn, !ycodemap, yexp, yNormalization);

	destroy();
	// XXX omit unused downstream params? e.g. chartState?
	return drawChart(_.merge(params, {
		xlabel, ylabel,
		cohort, cohortSamples, samplesLength, // why both cohortSamples an samplesLength??
		scatterColorScale, scatterColorData, scatterColorDataCodemap,
		samplesMatched,
		violin,
		xdata, ydata // normalized
	}));
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
var highchartViewSelect = el(HighchartView);

// XXX This is suboptimal. We drop 'advanced' from chartState because
// otherwise it causes a re-render when the user expands the options.
// Should probably not be putting 'advanced' in the global state, but
// instead keep it in local state. We could also prune what we send
// to HighchartView, but that's a larger refactor.
var highchartView = props =>
	highchartViewSelect(
		_.updateIn(props, ['xenaState', 'chartState'], cs => _.omit(cs, 'advanced'))) ;

var closeButton = onClose =>
	iconButton({className: compStyles.close, onClick: onClose, icon: 'close'});

// wrap handlers to add gaEvents
var gaSwap = fn => () => {
	gaEvents('chart', 'swapAxes');
	fn();
};

var gaViolin = fn => () => {
	gaEvents('chart', 'toggleViolin');
	fn();
};

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

	onClose = () => {
		gaEvents('spreadsheet', 'columnChart-close');
		this.props.callback(['heatmap']);
	}

	render() {
		var {callback, appState: xenaState} = this.props,
			{chartState} = xenaState,
			set = (...args) => {
				var cs = _.assocIn(chartState, ...args);
				callback(['chart-set-state', cs]);
			};

		// XXX note that this will also display if data is still loading, which is
		// a bit misleading.
		// XXX this should now be happening in ChartWizard, so we should drop this.
		if (!(v(chartState.ycolumn) && xenaState.cohort && xenaState.samples &&
				xenaState.columnOrder.length > 0)) {
			return card({className: classNames(compStyles.ChartView, compStyles.error)},
				"There is no plottable data. Please add some from the Visual Spreadsheet.",
				button({label: 'Close', onClick: () => callback(['heatmap'])}));
		}

		var {xcolumn, ycolumn, colorColumn, advanced, violin} = chartState,
			{columns} = xenaState,
			xdata = getColumnValues(xenaState, xcolumn),
			xcodemap = _.getIn(columns, [xcolumn, 'codes']),
			ydata = getColumnValues(xenaState, ycolumn),
			ycodemap = _.getIn(columns, [ycolumn, 'codes']),
			yexpOpts = expOptions(columns[ycolumn], ydata),
			xexpOpts = expOptions(columns[xcolumn], xdata),
			xfield = _.getIn(xenaState.columns, [xcolumn, 'fields', 0]),
			yfields = columns[ycolumn].fields,
			// doScatter is really "show scatter color selector", which
			// we only do if y is single-valued.
			doScatter = !xcodemap && xfield && yfields.length === 1;

		var drawProps = {ydata, ycolumn,
			xdata, xcolumn, doScatter, colorColumn, columns,
			xcodemap, ycodemap, yfields, xfield, callback,
			destroy: this.destroy,
			yexp: yexpOpts[chartState.expState[ycolumn]],
			xexp: xexpOpts[chartState.expState[xcolumn]]
		};

		var colorAxisDiv = doScatter ? axisSelector(xenaState, 'Color',
				ev => set(['colorColumn'], ev.currentTarget.value)) : null;
		var codedVCoded = v(xcolumn) && !isFloat(columns, xcolumn) && v(ycolumn) &&
			!isFloat(columns, ycolumn);
		var swapAxes = codedVCoded || doScatter ? button({label: 'Swap X and Y',
			onClick: gaSwap(() => set(['ycolumn'], xcolumn, ['xcolumn'], ycolumn))}) :
			null;

		var yExp = ycodemap ? null :
			buildExpDropdown({
				opts: yexpOpts,
				index: chartState.expState[ycolumn],
				label: 'Y unit',
				onChange: i => set(['expState', ycolumn], i)});

		var xExp = !v(xcolumn) || xcodemap ? null :
			buildExpDropdown({
				opts: xexpOpts,
				index: chartState.expState[xcolumn],
				label: 'X unit',
				onChange: i => set(['expState', chartState.xcolumn], i)});

		var normalization = ycodemap ? null :
			buildNormalizationDropdown(
				chartState.normalizationState[ycolumn],
				i => set(['normalizationState', chartState.ycolumn], i));

		var violinOpt = (xcodemap && !ycodemap) || (!v(xcolumn) && yfields.length > 1) ?
			button({label: `View as  ${violin ? 'boxplot' : 'violin plot'}`,
				onClick: gaViolin(() => set(['violin'], !violin))}) :
			null;

		var advOpt =
			div({className: compStyles.controlPanel},
				div({className: compStyles.accordion +
						(advanced ? ` ${compStyles.show}` : '')},
					colorAxisDiv && div({className: compStyles.row},
						colorAxisDiv),
					div({className: compStyles.row},
						yExp,
						normalization),
					xExp && div({className: compStyles.row},
						xExp)));

		var HCV =
			div(highchartView({xenaState, drawProps}),
				yExp && button({label: advanced ? 'Hide options' : 'Advanced options',
					className: compStyles.advanced,
					icon: advanced ? 'expand_less' : 'expand_more',
					onClick: () => set(['advanced'], !advanced)}),
				yExp && advOpt);


		// statistics XXX note that we scribble over stats. Should either render
		// it in react, or make another wrapper component so react won't touch it.
		// otoh, since we always re-render, it kinda works as-is.

		return div({className: compStyles.ChartView},
				closeButton(this.onClose),
				HCV,
				div({className: compStyles.right},
					div({className: compStyles.actions},
						button({label: 'Make another graph', onClick:
							() => set(['another'], true)}),
						swapAxes,
						violinOpt),
					div({id: 'stats', className: compStyles.stats})));
	};
}

export default Chart;
